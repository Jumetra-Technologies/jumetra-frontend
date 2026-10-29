// Kiungo Hybrid runtime: the board's side of the link (INJ-03, INJ-04).
//
// This file is compiled into every Hybrid build next to the user's sketch.
// The user's code never includes it. The generated forced-include header
// (kiungo_shim.h, written per project by @kiungo/core's shim generator) is
// what redirects the sketch: `Serial` becomes a tagged stream, and the pin
// functions of virtual pins answer from values the PC pushes.
//
// Link: 115200 baud, COBS frames delimited by 0x00. Frame = type, payload.
//
//   PC -> board                              board -> PC
//   0x01 HELLO                               0x81 HELLO_ACK  [proto u8, sensors u8]
//   0x02 SET   [sensor u8, value i32 LE]     0x82 TEXT       [bytes...]      the user's Serial output
//   0x03 IN    [bytes...]  user's Serial.read 0x83 ACK        [seq u8]
//   0x04 PING  [seq u8]                      0x84 STATS      [frames_in u16, bad u16, dropped u16]
//
// The board never waits on the link. Frames are read when the user's code
// calls into the runtime (a sensor read, Serial, or serialEvent between
// loops), so the sketch keeps its own timing (OUT-01 principle).
#pragma once
#include <Arduino.h>
#include <stdint.h>

#ifndef KIUNGO_MAX_SENSORS
#define KIUNGO_MAX_SENSORS 8
#endif
#ifndef KIUNGO_FRAME_MAX
#define KIUNGO_FRAME_MAX 64
#endif
#define KIUNGO_PROTOCOL 1
#define KIUNGO_LINK_BAUD 115200

enum KiungoFrame : uint8_t {
  KIUNGO_HELLO = 0x01,
  KIUNGO_SET = 0x02,
  KIUNGO_IN = 0x03,
  KIUNGO_PING = 0x04,
  KIUNGO_HELLO_ACK = 0x81,
  KIUNGO_TEXT = 0x82,
  KIUNGO_ACK = 0x83,
  KIUNGO_STATS = 0x84,
};

// Read every byte waiting on the link and apply complete frames. Cheap when
// nothing is waiting. Called by the runtime itself before every virtual read.
void kiungo_poll();

// The last value the PC pushed for a sensor, or `fallback` if none yet.
int32_t kiungo_sensor_value(uint8_t sensor, int32_t fallback);
bool kiungo_sensor_known(uint8_t sensor);

// Send a frame to the PC. Never blocks longer than the UART's own buffer.
void kiungo_send(uint8_t type, const uint8_t* payload, uint8_t length);

// Pin functions for the forced-include header. A pin that is virtual answers
// from the sensor table; any other pin goes to the real hardware.
int kiungo_digitalRead(uint8_t pin);
int kiungo_analogRead(uint8_t pin);
unsigned long kiungo_pulseIn(uint8_t pin, uint8_t state, unsigned long timeout = 1000000UL);
unsigned long kiungo_pulseInLong(uint8_t pin, uint8_t state, unsigned long timeout = 1000000UL);

// Which sensor id a pin reads from (0xFF: the pin is real). The generated
// kiungo_shim.h defines KIUNGO_PIN_TABLE; the runtime turns it into this.
int8_t kiungo_sensor_for_pin(uint8_t pin);

// The sketch's own serialEvent(), if it has one, renamed by the shim header
// so the runtime's hook can run first.
void kiungo_user_serialEvent() __attribute__((weak));

// The user's Serial in a Hybrid build: output goes out as TEXT frames, input
// comes from IN frames, and the link itself always runs at 115200.
class KiungoSerial : public Stream {
 public:
  void begin(unsigned long baud);
  void begin(unsigned long baud, uint8_t config);
  void end();
  int available() override;
  int peek() override;
  int read() override;
  int availableForWrite();
  void flush() override;
  size_t write(uint8_t c) override;
  size_t write(const uint8_t* buffer, size_t size) override;
  using Print::write;
  operator bool() { return true; }

 private:
  uint8_t out_[32];
  uint8_t outLen_ = 0;
};
extern KiungoSerial kiungoSerial;
