import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, smdLed, soic, vcc } from "../../sdk";
import { COPPER, qfn, serpentine, smdCrystal } from "./_shared";

/** The ESP-01 board is 1 mm thick, not the usual 1.6. */
const TOP = 1;
const BLACK = "#1f2124";

const header = pinHeader(3.34, 19.9, 4, { style: "up", rows: 2, z: TOP });

export default definePart({
  id: "wifi-module",
  name: "ESP-01 Wi-Fi module",
  aka: ["ESP8266 ESP-01", "ESP-01", "Wi-Fi module", "AT-command Wi-Fi"],
  group: "radios",
  rank: 2,
  summary: "A postage stamp that joins your Wi-Fi. Talk to it with AT commands over serial, or program the ESP8266 on it directly and it becomes the whole project. It needs a proper 3.3 V supply.",
  size: { w: 14.3, h: 24.8, d: 9.5 },
  solids: [
    board(14.3, 24.8, BLACK, { radius: 0.2, t: TOP }),
    // The meander antenna along the top edge, printed in copper under thin mask.
    serpentine(1.6, 1.2, 11.1, 7, 1, { z: TOP, width: 0.45 }),
    { kind: "path", d: "M 1.6 1.2 L 1.6 9.2", color: COPPER, width: 0.45, z: TOP },
    ...qfn(4.8, 12.4, 5, "8266EX", { id: "soc", z: TOP, perSide: 7, labelSize: 0.8 }),
    ...soic(10.5, 12.3, 4, "25Q80", { id: "flash", z: TOP, dir: "y" }),
    ...smdCrystal(3.3, 15.9, TOP),
    ...smd(7.4, 16.2, "c", "x", "0603", TOP),
    ...smd(7.4, 17.6, "r", "x", "0603", TOP),
    ...smd(10.6, 16.3, "r", "y", "0603", TOP),
    ...smd(12.2, 16.3, "c", "y", "0603", TOP),
    ...smd(1.4, 12.2, "c", "y", "0603", TOP),
    ...smd(1.4, 14.3, "r", "y", "0603", TOP),
    smdLed(8.4, 14.7, "#ff3b3b", "led-pwr", TOP),
    smdLed(8.4, 18.5, "#3b82f6", "led-tx", TOP),
    silk(7.15, 9.0, "ESP-01", 1.1, MATERIAL.silk, { anchor: "middle", weight: 700, z: TOP }),
    header,
  ],
  features: [
    { id: "antenna", label: "PCB antenna", kind: "antenna", x: 1, y: 0.8, w: 12.3, h: 8.6, note: "A zig-zag of copper tuned to 2.4 GHz. It reaches 20 to 30 m indoors. Keep metal and the breadboard clear of it." },
    { id: "soc", label: "ESP8266EX", kind: "chip", x: 2.3, y: 9.9, w: 5, h: 5, note: "An 80 MHz chip with Wi-Fi and the TCP/IP stack built in. It runs your code or the AT firmware. The same chip as on a NodeMCU." },
    { id: "flash", label: "Flash chip", kind: "chip", x: 8.5, y: 9.5, w: 4.8, h: 5.8, note: "1 MB (older boards 512 KB) holding the firmware or your sketch." },
    { id: "xtal", label: "26 MHz crystal", kind: "chip", x: 3.3, y: 15.9, w: 3.2, h: 2.5, note: "The clock the radio is timed from." },
    { id: "leds", label: "Power and TX LEDs", kind: "led", x: 8.4, y: 14.7, w: 1.6, h: 4.6, note: "Red: powered. Blue: flickers when the chip sends on the serial pins, and once at boot." },
    { id: "header", label: "2 × 4 header", kind: "pins", x: 2.07, y: 18.63, w: 10.16, h: 5.08, note: "Top row GND, GPIO2, GPIO0, RX. Bottom row TX, CH_PD, RST, VCC. 3.3 V only. It is two rows wide, so it straddles a breadboard's gap." },
  ],
  pins: [
    vcc("VCC", "3.3 V only, and it takes about 300 mA in bursts. An Uno's 3.3 V pin cannot give that."),
    gnd("GND"),
    pin("TX", "uart", "tx", "Serial out, 3.3 V. 115200 baud on most firmware."),
    pin("RX", "uart", "rx", "Serial in, 3.3 V and not 5 V tolerant. From a 5 V board, use a divider."),
    pin("EN", "digital", "opt", "Chip enable (CH_PD). Hold it high to run.", { label: "CH_PD (EN)", required: false }),
    pin("RST", "digital", "opt", "Pull low to reset the chip.", { required: false }),
    pin("GPIO0", "digital", "opt", "Low at boot: flashing mode. Free to use afterwards.", { required: false }),
    pin("GPIO2", "digital", "opt", "Spare I/O. It must be high at boot.", { required: false }),
  ],
  pinAt: name(header, "GND", "GPIO2", "GPIO0", "RX", "TX", "EN", "RST", "VCC"),
  circuit: {
    blocks: [
      { id: "uart", label: "TX / RX", sub: "AT commands or code", kind: "pin", col: 0, row: 1, at: "RX", note: "115200 baud on most firmware." },
      { id: "soc", label: "ESP8266EX", sub: "80 MHz + TCP/IP", kind: "mcu", col: 1, row: 1, at: "soc", note: "A real microcontroller with Wi-Fi built in." },
      { id: "radio", label: "Wi-Fi radio", sub: "802.11 b/g/n", kind: "antenna", col: 2, row: 1, at: "soc", note: "The 2.4 GHz transceiver is on the same chip." },
      { id: "ant", label: "PCB antenna", kind: "antenna", col: 3, row: 1, at: "antenna", note: "Printed copper." },
      { id: "router", label: "Router and cloud", kind: "world", col: 3, row: 2, note: "Your network, then the internet." },
      { id: "flash", label: "SPI flash", sub: "1 MB", kind: "ic", col: 1, row: 0, at: "flash", note: "Firmware lives here." },
      { id: "vcc", label: "VCC 3.3 V", sub: "300 mA bursts", kind: "power", col: 0, row: 0, at: "VCC", note: "A weak supply shows up as random resets." },
      { id: "boot", label: "GPIO0 / CH_PD", sub: "boot mode, enable", kind: "pin", col: 0, row: 2, at: "GPIO0", note: "CH_PD high to run; GPIO0 low at reset to flash." },
    ],
    links: [
      { from: "uart", to: "soc", kind: "data", both: true },
      { from: "soc", to: "radio", kind: "data", both: true },
      { from: "radio", to: "ant", kind: "rf", both: true },
      { from: "ant", to: "router", kind: "rf", label: "Wi-Fi", both: true },
      { from: "flash", to: "soc", kind: "data", both: true },
      { from: "vcc", to: "soc", kind: "power", label: "80 mA, 320 mA peak" },
      { from: "boot", to: "soc", kind: "signal" },
    ],
    steps: [
      "CH_PD high and 3.3 V on VCC: the chip boots from the flash. With GPIO0 low at that moment it waits for new firmware instead.",
      "Stock firmware speaks AT commands over the serial pins: AT+CWJAP joins your Wi-Fi, AT+CIPSTART opens a TCP connection.",
      "Or program it directly with the Arduino core: then it is a tiny Wi-Fi computer with two spare GPIOs.",
      "Transmit bursts draw 300 mA or more at 3.3 V. A weak supply sags below 2.5 V and the chip reboots. A proper 3.3 V regulator plus a 100 µF capacitor fixes most 'random resets'.",
    ],
  },
  facts: [
    { label: "Chip", value: "ESP8266EX, 80 MHz" },
    { label: "Wi-Fi", value: "802.11 b/g/n, 2.4 GHz" },
    { label: "Flash", value: "1 MB" },
    { label: "GPIO", value: "2 spare (GPIO0, GPIO2)" },
    { label: "Supply", value: "3.3 V, 80 mA, 320 mA peak" },
    { label: "Size", value: "24.8 × 14.3 mm" },
  ],
  spec: {
    form: {
      mass: 2,
      mount: "jumpers",
      pitch: 2.54,
      note: "A 2 × 4 header on the 2.54 mm grid. It is two rows wide, so it does not fit a breadboard's gap cleanly: use jumper wires or an adapter board.",
    },
    power: {
      supply: { min: 2.5, max: 3.6, typ: 3.3 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 15, active: 80, peak: 320 },
      interface: "UART 3.3 V, 115200 baud, plus GPIO0 and GPIO2",
      note: "Transmit at +17 dBm takes about 170 mA; bursts and joining a network reach 300 to 320 mA. Modem sleep is 15 mA and deep sleep 20 µA.",
    },
    sourcing: { mpn: "ESP-01 (ESP8266EX)", maker: "Ai-Thinker, with Espressif's ESP8266EX", lifecycle: "active", usd: [1.5, 4], note: "The ESP-01S is a newer board with the same pins and a bigger flash." },
    limits: [
      "It is 3.3 V only and not 5 V tolerant: feed RX from a 5 V board through a 1 kΩ and 2 kΩ divider.",
      "It pulls 300 to 320 mA in bursts. An Uno's 3.3 V pin gives about 50 mA, so the board reboots in loops, worst while joining the router. Use a 500 mA 3.3 V regulator and 100 µF across VCC and GND.",
      "Only GPIO0 and GPIO2 come out, and both are boot pins: held low at power-up they change the boot mode.",
      "Wi-Fi only, no Bluetooth, and a range of 20 to 30 m indoors.",
      "The 2 × 4 header is not breadboard friendly: it straddles the gap and needs an adapter or jumper wires.",
    ],
    upgrade: [
      { part: "esp32", name: "ESP32 board", why: "Wi-Fi plus Bluetooth LE on one board, about 20 usable pins, USB programming and its own 3.3 V regulator, so no supply tricks." },
      { part: "esp8266", name: "NodeMCU (ESP8266 on a board)", why: "The same chip with USB programming and an 800 mA 3.3 V regulator on the board, so it runs from a normal 5 V USB supply, with many more pins." },
    ],
    refs: [
      "https://www.digikey.in/en/htmldatasheets/production/3025162/0/0/1/esp-wroom-02.html",
      "https://shillehtek.com/blogs/shillehtek-product-manuals/esp8266-esp-01-serial-wifi-module-1mb-wireless-transceiver-iot-manual",
      "https://esp32.co.uk/esp-01-esp-01s-survival-guide-esp8266-wiring-boot-modes-flashing-and-real-world-gotchas/",
    ],
  },
  lab: { supply: [3, 3.6] },
  animate: { lit: ["led-pwr", "led-tx"] },
  experiment: { title: "Join the Wi-Fi", idea: "Send AT+CWJAP with your network name and watch it get an IP address; then fetch a web page with AT+CIPSTART." },
  tags: ["esp-01", "esp8266", "wifi", "wi-fi", "wireless", "at commands", "internet", "radio", "module"],
});
