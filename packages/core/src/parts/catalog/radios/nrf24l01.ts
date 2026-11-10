import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, vcc } from "../../sdk";
import { COPPER, qfn, serpentine, smdCrystal } from "./_shared";

const TOP = 1;
const BLACK = "#17191d";

const header = pinHeader(3.79, 22.5, 4, { style: "up", rows: 2, z: TOP });

export default definePart({
  id: "nrf24l01",
  name: "nRF24L01+ radio",
  aka: ["NRF24", "2.4 GHz transceiver", "RF24 module"],
  group: "radios",
  rank: 3,
  summary: "Board-to-board radio without Wi-Fi or Bluetooth: tiny packets, hardware acknowledgements, six listening addresses, about 100 m in the open. The link inside most DIY remote controls.",
  size: { w: 15.2, h: 29, d: 9.5 },
  solids: [
    board(15.2, 29, BLACK, { radius: 0.2, t: TOP }),
    // The zig-zag 2.4 GHz antenna at the far end, fed by a trace from the chip.
    serpentine(2.2, 1.3, 10.6, 7, 1.15, { z: TOP, width: 0.45 }),
    { kind: "path", d: "M 12.8 1.3 L 12.8 9.4 L 7.6 9.4 L 7.6 11.8", color: COPPER, width: 0.4, z: TOP },
    ...qfn(7.6, 14.2, 4, "nRF24", { id: "nrf", z: TOP, perSide: 5, labelSize: 0.8 }),
    ...smdCrystal(10.6, 17.1, TOP),
    ...smd(3.4, 12.3, "c", "x", "0603", TOP),
    ...smd(3.4, 14.2, "r", "x", "0603", TOP),
    ...smd(3.4, 16.1, "c", "x", "0603", TOP),
    ...smd(10.2, 12.4, "c", "x", "0603", TOP),
    ...smd(10.2, 14.2, "r", "x", "0603", TOP),
    ...smd(6.8, 17.9, "c", "x", "0603", TOP),
    ...smd(3.4, 18.2, "r", "x", "0603", TOP),
    silk(7.6, 20.4, "NRF24L01+", 1, MATERIAL.silk, { anchor: "middle", weight: 700, z: TOP }),
    silk(1.6, 24.5, "1", 0.9, MATERIAL.silk, { z: TOP }),
    header,
  ],
  features: [
    { id: "antenna", label: "PCB antenna", kind: "antenna", x: 1.6, y: 0.8, w: 11.8, h: 9.4, note: "A printed zig-zag tuned to 2.4 GHz. The PA+LNA version swaps it for an SMA socket and a whip, good for a kilometer in the open." },
    { id: "nrf", label: "nRF24L01+", kind: "chip", x: 5.6, y: 12.2, w: 4, h: 4, note: "The radio and packet engine in one chip: addresses, acknowledgements and retries happen in hardware, at 250 kbps to 2 Mbps." },
    { id: "xtal", label: "16 MHz crystal", kind: "chip", x: 10.6, y: 17.1, w: 3.2, h: 2.5, note: "The radio's timing reference." },
    { id: "header", label: "2 × 4 header", kind: "pins", x: 2.52, y: 21.23, w: 10.16, h: 5.08, note: "Eight pins; pin 1 (GND) is marked. VCC is 3.3 V and the signal pins tolerate 5 V logic. Top row VCC, CSN, MOSI, IRQ; bottom row GND, CE, SCK, MISO." },
  ],
  pins: [
    gnd("GND", "Ground. Pin 1, marked on the board."),
    vcc("VCC", "3.3 V only: 5 V destroys it. Add a 10 µF capacitor across VCC and GND."),
    pin("CE", "digital", "drive", "Chip enable: high to transmit or listen.", { label: "CE" }),
    pin("CSN", "spi", "cs", "SPI chip select, active low.", { label: "CSN" }),
    pin("SCK", "spi", "sck", "SPI clock."),
    pin("MOSI", "spi", "mosi", "SPI data into the radio."),
    pin("MISO", "spi", "miso", "SPI data out of the radio."),
    pin("IRQ", "digital", "opt", "Goes low when a packet was received or sent.", { required: false }),
  ],
  pinAt: name(header, "VCC", "CSN", "MOSI", "IRQ", "GND", "CE", "SCK", "MISO"),
  circuit: {
    blocks: [
      { id: "spi", label: "SPI", sub: "MOSI, MISO, SCK, CSN", kind: "pin", col: 0, row: 1, at: "MOSI", note: "Configuration and payloads, up to 10 MHz." },
      { id: "eng", label: "Packet engine", sub: "auto-ack, retries", kind: "ic", col: 1, row: 1, at: "nrf", note: "Builds packets, checks CRCs, waits for acknowledgements." },
      { id: "radio", label: "2.4 GHz radio", sub: "126 channels", kind: "ic", col: 2, row: 1, at: "nrf", note: "A GFSK transceiver." },
      { id: "ant", label: "PCB antenna", kind: "antenna", col: 3, row: 1, at: "antenna", note: "Printed copper." },
      { id: "peer", label: "Other node", sub: "up to 6 pipes", kind: "world", col: 3, row: 2, note: "Another board with the same module." },
      { id: "xtal", label: "16 MHz crystal", kind: "passive", col: 1, row: 0, at: "xtal", note: "Timing for the radio." },
      { id: "ce", label: "CE / IRQ", sub: "go, done", kind: "pin", col: 0, row: 0, at: "CE", note: "CE starts the radio; IRQ tells you when something happened." },
      { id: "vcc", label: "VCC 3.3 V", sub: "+ capacitor", kind: "power", col: 0, row: 2, at: "VCC", note: "The number-one cause of trouble is a sagging supply." },
    ],
    links: [
      { from: "spi", to: "eng", kind: "data", both: true },
      { from: "eng", to: "radio", kind: "data", both: true },
      { from: "radio", to: "ant", kind: "rf", both: true },
      { from: "ant", to: "peer", kind: "rf", label: "2.4 GHz", both: true },
      { from: "xtal", to: "radio", kind: "signal", label: "clock" },
      { from: "ce", to: "eng", kind: "signal" },
      { from: "vcc", to: "eng", kind: "power", label: "12 mA" },
    ],
    steps: [
      "Your board configures the chip over SPI: channel, data rate, and a 5-byte address for each 'pipe'.",
      "CE high: the packet engine sends your bytes, waits for the other node's acknowledgement and retries on its own if it didn't come.",
      "Receiving nodes filter packets by address in hardware, so up to six transmitters can talk to one receiver.",
      "Most 'it doesn't work' cases are power: 3.3 V with a 10 µF capacitor soldered across VCC and GND.",
    ],
  },
  facts: [
    { label: "Band", value: "2.4 GHz, 126 channels" },
    { label: "Data rate", value: "250 kbps – 2 Mbps" },
    { label: "Range", value: "about 100 m open air" },
    { label: "Interface", value: "SPI + CE, IRQ" },
    { label: "Supply", value: "1.9–3.6 V, 12–14 mA" },
    { label: "Size", value: "29 × 15 mm" },
  ],
  spec: {
    form: {
      mass: 2,
      mount: "jumpers",
      pitch: 2.54,
      note: "A 2 × 4 header on the 2.54 mm grid. It straddles a breadboard's gap, so most builders use jumper wires or a small adapter board.",
    },
    power: {
      supply: { min: 1.9, max: 3.6, typ: 3.3 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 0.026, active: 13.5, peak: 13.5 },
      interface: "SPI mode 0 up to 10 MHz, plus CE and IRQ",
      note: "Transmit at 0 dBm takes 11.3 mA and receive at 2 Mbps 13.5 mA. The start of a transmission makes short surges that a weak supply cannot follow.",
    },
    sourcing: { mpn: "nRF24L01+", maker: "Nordic Semiconductor (module: generic)", lifecycle: "generic", usd: [1, 3], note: "Many modules carry clone chips (Si24R1, BK2423) that draw a little more." },
    limits: [
      "The supply is 3.6 V at most: the 5 V pin of an Arduino kills it. The inputs, though, survive 5 V signals.",
      "There is no bulk capacitor on the module. Without 10 µF across VCC and GND it drops packets or only sends and never receives.",
      "Output is 0 dBm: about 100 m in open air and 10 to 30 m indoors.",
      "It shares 2.4 GHz with Wi-Fi, so packets get lost near a router.",
      "No routing and a 32-byte payload: it links nodes, it does not make a network.",
    ],
    upgrade: [
      { name: "nRF24L01+ PA+LNA with SMA antenna", why: "+20 dBm output and a low-noise receiver reach about 1 km in the open. It draws 115 mA or more while sending, so give it a 3.3 V regulator board." },
      { part: "lora", name: "Ra-02 LoRa module (SX1278)", why: "Kilometers of range at about 120 mA while sending, but only about 0.3 to 37 kbps." },
    ],
    refs: [
      "https://cdn.sparkfun.com/assets/home_page_posts/2/6/7/3/nRF24L01P.pdf",
      "https://components101.com/wireless/nrf24l01-pinout-features-datasheet",
      "https://www.mysensors.org/view/171",
    ],
  },
  experiment: { title: "Wireless button", idea: "Two boards, two modules: press a button on one and light an LED on the other, then send a sensor reading every second." },
  tags: ["nrf24l01", "nrf24", "2.4ghz", "wireless", "spi", "radio", "rf24", "remote"],
});
