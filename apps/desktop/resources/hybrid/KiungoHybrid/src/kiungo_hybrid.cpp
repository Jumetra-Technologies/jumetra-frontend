// Kiungo Hybrid runtime. See kiungo_hybrid.h for the link format.
#include "kiungo_hybrid.h"

#include <string.h>

// The shim header renamed these for the sketch; this file wants the real ones.
#undef Serial
#undef digitalRead
#undef analogRead
#undef pulseIn
#undef pulseInLong
#undef serialEvent
#define LINK Serial

#ifndef KIUNGO_PIN_TABLE
// Built without a generated shim header (a plain compile of the library): no pin is virtual.
#define KIUNGO_PIN_TABLE {}
#endif
static const uint8_t pinSensor[] PROGMEM = KIUNGO_PIN_TABLE;
static const uint8_t pinSensorCount = sizeof(pinSensor);

int8_t kiungo_sensor_for_pin(uint8_t pin) {
  if (pin >= pinSensorCount) return -1;
  uint8_t s = pgm_read_byte(pinSensor + pin);
  return s == 0xFF ? -1 : (int8_t)s;
}

// ----- sensor table -----
static int32_t sensorValue[KIUNGO_MAX_SENSORS];
static uint8_t sensorKnown[(KIUNGO_MAX_SENSORS + 7) / 8];

static inline bool known(uint8_t id) { return id < KIUNGO_MAX_SENSORS && (sensorKnown[id >> 3] & (1 << (id & 7))); }

int32_t kiungo_sensor_value(uint8_t sensor, int32_t fallback) {
  kiungo_poll();
  return known(sensor) ? sensorValue[sensor] : fallback;
}

bool kiungo_sensor_known(uint8_t sensor) {
  kiungo_poll();
  return known(sensor);
}

// ----- stats -----
static uint16_t framesIn = 0, framesBad = 0, framesDropped = 0;

// ----- user input queue (IN frames -> Serial.read) -----
static uint8_t inBuf[32];
static uint8_t inHead = 0, inTail = 0;
static inline uint8_t inCount() { return (uint8_t)(inHead - inTail); }

// ----- COBS decoder, fed one byte at a time -----
static uint8_t rx[KIUNGO_FRAME_MAX];
static uint8_t rxLen = 0;
static uint8_t rxCode = 0, rxRun = 0;
static bool rxBad = false;

static void handle(const uint8_t* frame, uint8_t len);

static void rxReset() {
  rxLen = 0;
  rxCode = 0;
  rxRun = 0;
  rxBad = false;
}

static void rxByte(uint8_t b) {
  if (b == 0) {  // end of frame
    if (rxLen > 0 && !rxBad && rxRun == 0) {  // a run cut short means a truncated frame
      framesIn++;
      handle(rx, rxLen);
    } else if (rxLen > 0 || rxBad || rxRun != 0) {
      framesBad++;
    }
    rxReset();
    return;
  }
  if (rxBad) return;
  if (rxRun == 0) {
    // A code byte: distance to the next zero. If the previous code was 0xFF, no zero is implied.
    if (rxCode != 0 && rxCode != 0xFF) {
      if (rxLen >= KIUNGO_FRAME_MAX) { rxBad = true; return; }
      rx[rxLen++] = 0;
    }
    rxCode = b;
    rxRun = (uint8_t)(b - 1);
    return;
  }
  if (rxLen >= KIUNGO_FRAME_MAX) { rxBad = true; return; }
  rx[rxLen++] = b;
  rxRun--;
}

static void handle(const uint8_t* f, uint8_t len) {
  if (len < 1) return;
  switch (f[0]) {
    case KIUNGO_SET:
      if (len == 6 && f[1] < KIUNGO_MAX_SENSORS) {
        int32_t v = (int32_t)((uint32_t)f[2] | ((uint32_t)f[3] << 8) | ((uint32_t)f[4] << 16) | ((uint32_t)f[5] << 24));
        sensorValue[f[1]] = v;
        sensorKnown[f[1] >> 3] |= (1 << (f[1] & 7));
      } else {
        framesBad++;
      }
      break;
    case KIUNGO_IN:
      // Bytes the sketch hasn't read yet queue up to 32; beyond that each byte is counted as dropped.
      for (uint8_t i = 1; i < len; i++) {
        if (inCount() >= sizeof(inBuf)) { framesDropped++; continue; }
        inBuf[inHead++ & (sizeof(inBuf) - 1)] = f[i];
      }
      break;
    case KIUNGO_PING: {
      uint8_t seq = len > 1 ? f[1] : 0;
      kiungo_send(KIUNGO_ACK, &seq, 1);
      break;
    }
    case KIUNGO_HELLO: {
      uint8_t p[2] = {KIUNGO_PROTOCOL, KIUNGO_MAX_SENSORS};
      kiungo_send(KIUNGO_HELLO_ACK, p, 2);
      uint8_t s[6] = {(uint8_t)framesIn, (uint8_t)(framesIn >> 8), (uint8_t)framesBad, (uint8_t)(framesBad >> 8), (uint8_t)framesDropped, (uint8_t)(framesDropped >> 8)};
      kiungo_send(KIUNGO_STATS, s, 6);
      break;
    }
    default:
      framesBad++;
  }
}

void kiungo_poll() {
  while (LINK.available() > 0) rxByte((uint8_t)LINK.read());
}

// Arduino's main() calls serialEvent() between loop() iterations when bytes wait.
void serialEvent() {
  kiungo_poll();
  if (kiungo_user_serialEvent && kiungoSerial.available()) kiungo_user_serialEvent();
}

// ----- COBS encoder: write a frame straight to the UART -----
void kiungo_send(uint8_t type, const uint8_t* payload, uint8_t length) {
  // Encode into a small stack buffer: type + payload, COBS, trailing zero.
  if (length > KIUNGO_FRAME_MAX - 1) length = KIUNGO_FRAME_MAX - 1;
  uint8_t raw[KIUNGO_FRAME_MAX];
  raw[0] = type;
  memcpy(raw + 1, payload, length);
  uint8_t n = (uint8_t)(length + 1);
  uint8_t enc[KIUNGO_FRAME_MAX + 3];
  uint8_t codeAt = 0, code = 1, w = 1;
  for (uint8_t i = 0; i < n; i++) {
    if (raw[i] == 0) {
      enc[codeAt] = code;
      codeAt = w++;
      code = 1;
    } else {
      enc[w++] = raw[i];
      code++;
      if (code == 0xFF) {
        enc[codeAt] = code;
        codeAt = w++;
        code = 1;
      }
    }
  }
  enc[codeAt] = code;
  enc[w++] = 0;
  // A frame that doesn't fit in the UART buffer is dropped whole rather than
  // blocking the user's code (OUT-01: digitalWrite must never wait on USB).
  if (LINK.availableForWrite() < w) { framesDropped++; return; }
  LINK.write(enc, w);
}

// ----- pin functions -----
int kiungo_digitalRead(uint8_t pin) {
  int8_t s = kiungo_sensor_for_pin(pin);
  if (s < 0) return digitalRead(pin);
  return kiungo_sensor_value((uint8_t)s, LOW) ? HIGH : LOW;
}

int kiungo_analogRead(uint8_t pin) {
  // analogRead accepts A0..A5 or 0..5 on an Uno.
  uint8_t p = pin >= A0 ? pin : (uint8_t)(pin + A0);
  int8_t s = kiungo_sensor_for_pin(p);
  if (s < 0) return analogRead(pin);
  int32_t v = kiungo_sensor_value((uint8_t)s, 0);
  if (v < 0) v = 0;
  if (v > 1023) v = 1023;
  return (int)v;
}

// A virtual pulse: the pushed value is the pulse length in microseconds.
unsigned long kiungo_pulseIn(uint8_t pin, uint8_t state, unsigned long timeout) {
  int8_t s = kiungo_sensor_for_pin(pin);
  if (s < 0) return pulseIn(pin, state, timeout);
  int32_t v = kiungo_sensor_value((uint8_t)s, 0);
  if (v < 0) return 0;
  if (timeout && (unsigned long)v > timeout) return 0;
  return (unsigned long)v;
}

unsigned long kiungo_pulseInLong(uint8_t pin, uint8_t state, unsigned long timeout) {
  if (kiungo_sensor_for_pin(pin) < 0) return pulseInLong(pin, state, timeout);
  return kiungo_pulseIn(pin, state, timeout);
}

// ----- the user's Serial -----
KiungoSerial kiungoSerial;

void KiungoSerial::begin(unsigned long) { LINK.begin(KIUNGO_LINK_BAUD); }
void KiungoSerial::begin(unsigned long, uint8_t) { LINK.begin(KIUNGO_LINK_BAUD); }
void KiungoSerial::end() { flush(); LINK.end(); }

int KiungoSerial::available() {
  kiungo_poll();
  return inCount();
}

int KiungoSerial::peek() {
  kiungo_poll();
  return inCount() ? inBuf[inTail & (sizeof(inBuf) - 1)] : -1;
}

int KiungoSerial::read() {
  kiungo_poll();
  return inCount() ? inBuf[inTail++ & (sizeof(inBuf) - 1)] : -1;
}

int KiungoSerial::availableForWrite() { return sizeof(out_) - outLen_; }

void KiungoSerial::flush() {
  if (outLen_ == 0) return;
  kiungo_send(KIUNGO_TEXT, out_, outLen_);
  outLen_ = 0;
}

size_t KiungoSerial::write(uint8_t c) {
  out_[outLen_++] = c;
  if (c == '\n' || outLen_ >= sizeof(out_)) flush();
  return 1;
}

size_t KiungoSerial::write(const uint8_t* buffer, size_t size) {
  for (size_t i = 0; i < size; i++) write(buffer[i]);
  return size;
}
