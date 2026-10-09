import type { Block } from "@/lib/learning/types";

/**
 * Legal documents linked from the site footer.
 *
 * These are drafts written to match how Kiungo works today (browser storage,
 * Google sign-in, a backend that can drive real hardware). Each page shows a
 * notice that they are not yet in force until Jumetra Technologies has
 * reviewed them.
 */
export interface LegalDocument {
  slug: string;
  title: string;
  summary: string;
  /** ISO date the draft was last revised. */
  revised: string;
  blocks: Block[];
}

export const DRAFT_NOTICE =
  "This is a draft prepared for review by Jumetra Technologies. It describes how Kiungo works today and is not yet in force.";

const CONTACT = "Questions go to Jumetra Technologies through [github.com/Jumetra-Technologies](https://github.com/Jumetra-Technologies).";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    summary: "The rules for using Kiungo, what we provide, and what we don't promise.",
    revised: "2026-10-06",
    blocks: [
      { type: "h2", text: "What Kiungo is" },
      {
        type: "p",
        text: "Kiungo (formerly HHIP, the Universal Hybrid Hardware Simulation System) is a web platform made by Jumetra Technologies for learning, simulating and building robotics and IoT projects. It is in its first phase, a proof of concept. Features may change, move or be removed as the platform develops.",
      },
      { type: "h2", text: "Using Kiungo" },
      {
        type: "ul",
        items: [
          "You may use Kiungo for learning, teaching, research and building your own projects, including in a school, club or company.",
          "You must be at least 13 years old, or use Kiungo under the supervision of a teacher or guardian who accepts these terms for you.",
          "You are responsible for anything you do through your account, and for keeping your Google account secure.",
          "You must follow the [Acceptable Use Policy](/legal/acceptable-use).",
        ],
      },
      { type: "h2", text: "Your work" },
      {
        type: "p",
        text: "Projects, circuits, code, experiment records and reports you create are yours. Jumetra Technologies does not claim ownership of them. Where Kiungo stores them on your behalf, you give us permission to keep, display and process them so the platform can work, and nothing more.",
      },
      { type: "h2", text: "Real hardware" },
      {
        type: "callout",
        tone: "warning",
        title: "You are in charge of the bench",
        text: "Kiungo can send commands and firmware to physical boards connected to your computer. Electricity, motors and heat can injure people and damage equipment. You are responsible for wiring safely, checking voltages, and supervising anything that moves or heats up. Simulated results are a guide, not a guarantee of how a real circuit will behave.",
      },
      { type: "h2", text: "No warranty" },
      {
        type: "p",
        text: "Kiungo is provided as it is, without warranties of any kind. We do not promise that it will be available, accurate or free of errors, or that simulated behaviour matches real components. To the extent the law allows, Jumetra Technologies is not liable for loss or damage arising from your use of Kiungo, including damage to hardware.",
      },
      { type: "h2", text: "Changes and ending" },
      {
        type: "p",
        text: "We may change these terms as Kiungo develops. When we do, the revision date at the top of this page changes. If you keep using Kiungo after a change, you accept the new terms. We may suspend or close accounts that break these terms or the Acceptable Use Policy. You may stop using Kiungo at any time.",
      },
      { type: "h2", text: "Contact" },
      { type: "p", text: CONTACT },
    ],
  },
  {
    slug: "user-agreement",
    title: "User Agreement",
    summary: "What you get with an account, what we ask of you, and what happens to your work.",
    revised: "2026-10-06",
    blocks: [
      { type: "h2", text: "Accounts" },
      {
        type: "p",
        text: "You sign in to Kiungo with a Google account. We receive your name, email address and profile picture from Google and use them to identify you inside Kiungo. We never see your Google password. You can use most of Kiungo without signing in; signing in lets Kiungo recognise you across devices and is the basis for shared projects and classrooms as they arrive.",
      },
      { type: "h2", text: "Where your work lives" },
      {
        type: "ul",
        items: [
          "Projects, experiment records and reports are saved in your browser's local storage on the device you use. They are not uploaded unless a feature says so. Clearing site data removes them, and they do not follow you to another device.",
          "Engineering Lab workspaces, simulations, firmware projects and hybrid experiments are processed by the Kiungo backend so they can run.",
          "Learning progress and your theme choice are saved in your browser.",
        ],
      },
      { type: "h2", text: "What we ask of you" },
      {
        type: "ul",
        items: [
          "Give accurate information and don't impersonate anyone.",
          "Keep your account to yourself. If you think someone else is using it, sign out everywhere and tell us.",
          "Respect other people's work. Only upload code, images and documents you have the right to use.",
          "Follow the [Acceptable Use Policy](/legal/acceptable-use) and the [Terms of Service](/legal/terms).",
        ],
      },
      { type: "h2", text: "Content you upload" },
      {
        type: "p",
        text: "Anything you upload stays yours. By uploading it you confirm you have the right to, and you give Jumetra Technologies a licence to store and process it so Kiungo can show it back to you and to anyone you share it with. That licence ends when you delete the content or close your account, except for copies in routine backups, which expire on their own.",
      },
      { type: "h2", text: "Closing your account" },
      {
        type: "p",
        text: "Ask us to close your account at any time. We will remove your account record and the data tied to it from the backend within 30 days. Work saved in your browser is yours to delete by clearing site data for Kiungo.",
      },
      { type: "h2", text: "Contact" },
      { type: "p", text: CONTACT },
    ],
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    summary: "What you may and may not do with Kiungo, including with real hardware.",
    revised: "2026-10-06",
    blocks: [
      {
        type: "p",
        text: "Kiungo is for learning and building. This policy exists so the platform stays safe for the people and the hardware on the other end of it.",
      },
      { type: "h2", text: "Do" },
      {
        type: "ul",
        items: [
          "Experiment freely with simulated parts. Breaking a virtual circuit costs nothing.",
          "Share what you learn, with credit to the people whose work you build on.",
          "Report bugs, security problems and unsafe behaviour you notice.",
        ],
      },
      { type: "h2", text: "Don't" },
      {
        type: "ul",
        items: [
          "Use Kiungo to control hardware that could injure someone or damage property without the safeguards a competent person would expect: fuses, current limits, emergency stops, supervision.",
          "Upload or run firmware designed to damage a board, bypass its protections, or attack other devices or networks.",
          "Probe, overload or interfere with the Kiungo backend or other users' sessions.",
          "Use Kiungo to break the law, infringe copyright, or harass anyone.",
          "Scrape or bulk-download the component library, documentation or other users' content for redistribution.",
        ],
      },
      { type: "h2", text: "Hardware safety" },
      {
        type: "callout",
        tone: "warning",
        text: "Hybrid mode sends real signals to real pins. Before you connect a board: check the voltage every part expects (many sensors are 3.3 V, an Arduino Uno is 5 V), never power motors or relays from a microcontroller pin, and keep one hand on the power switch. The [hardware reference pages](/docs/hardware-knowledge) list the common mistakes for each part.",
      },
      { type: "h2", text: "Enforcement" },
      {
        type: "p",
        text: "We may remove content, suspend accounts or block access to the backend to stop a breach of this policy. Serious or repeated breaches may lead to a closed account. Where we can, we will tell you what happened and why.",
      },
      { type: "h2", text: "Contact" },
      { type: "p", text: CONTACT },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What Kiungo collects, why, where it is kept, and your choices.",
    revised: "2026-10-06",
    blocks: [
      {
        type: "p",
        text: "Kiungo collects as little as it can. This page lists everything it does collect, in plain words.",
      },
      { type: "h2", text: "What we collect and why" },
      {
        type: "table",
        head: ["Data", "Where it comes from", "Why", "Where it is kept"],
        rows: [
          ["Name, email address, profile picture", "Google, when you sign in", "To identify you inside Kiungo", "Kiungo backend and your browser's local storage"],
          ["Projects, experiment records, reports", "You", "So you can plan and document your work", "Your browser's local storage only"],
          ["Workspaces, simulations, firmware projects, hybrid experiments", "You, while using the Engineering Lab", "To run them", "Kiungo backend"],
          ["Theme, sidebar state, learning progress", "You", "To remember your preferences", "Your browser's local storage only"],
          ["Technical logs (requests, errors)", "Your browser's requests to the backend", "To keep Kiungo running and find faults", "Kiungo backend, for a limited time"],
        ],
        caption: "Everything Kiungo collects",
      },
      { type: "h2", text: "What we don't do" },
      {
        type: "ul",
        items: [
          "We don't sell your data or share it with advertisers.",
          "We don't run advertising or third-party analytics on Kiungo.",
          "We don't read your projects or experiment records except to fix a problem you ask us to look at.",
        ],
      },
      { type: "h2", text: "Google sign-in" },
      {
        type: "p",
        text: "Sign-in uses Google Identity Services. When you choose to sign in, Google shares your name, email address and profile picture with Kiungo and may set its own cookies, which are governed by [Google's privacy policy](https://policies.google.com/privacy). Kiungo does not receive your Google password or access to anything else in your Google account.",
      },
      { type: "h2", text: "Your choices" },
      {
        type: "ul",
        items: [
          "Use Kiungo without signing in. Only the features that need the backend will ask you to.",
          "Delete work saved in your browser by clearing site data for Kiungo.",
          "Ask us to close your account and remove the data tied to it. See the [User Agreement](/legal/user-agreement).",
          "Ask us what we hold about you, and to correct it.",
        ],
      },
      { type: "h2", text: "Children" },
      {
        type: "p",
        text: "Kiungo is built for students, including those under 18. Where a school or club signs up on behalf of pupils, the school or club is responsible for the consents its local law requires. We collect no more from a child than from anyone else.",
      },
      { type: "h2", text: "Changes" },
      {
        type: "p",
        text: "When this policy changes, the revision date at the top of the page changes. For a change that affects what we collect or why, we will tell signed-in users inside Kiungo.",
      },
      { type: "h2", text: "Contact" },
      { type: "p", text: CONTACT },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    summary: "Kiungo sets no cookies of its own. Here is what it stores in your browser instead.",
    revised: "2026-10-06",
    blocks: [
      {
        type: "p",
        text: "Kiungo does not set cookies. It keeps a small number of values in your browser's local storage so the app can remember you and your preferences between visits. Local storage never leaves your device unless a feature sends it to the Kiungo backend, and nothing in it is used for advertising or tracking.",
      },
      { type: "h2", text: "What Kiungo keeps in your browser" },
      {
        type: "table",
        head: ["Key", "What it holds", "How long"],
        rows: [
          ["`hhip-auth-session`", "Your sign-in token and profile after you sign in with Google", "Until you sign out or clear site data"],
          ["`hhip-account`", "Your display name and email, for the sidebar", "Until you sign out or clear site data"],
          ["`hhip-robotics-workspace:v1`", "Your projects, experiment records and reports", "Until you delete them or clear site data"],
          ["`hhip.lab:v1`", "Your Engineering Lab sessions: the parts, wires and activity log of each, and which one you had open", "Until you delete them or clear site data"],
          ["`hhip-learning-progress:v1`", "Which learning modules you have marked complete", "Until you clear site data"],
          ["`hhip-theme`", "Your chosen theme", "Until you change it or clear site data"],
          ["`hhip-sidebar-collapsed`", "Whether the sidebar is collapsed", "Until you change it or clear site data"],
        ],
        caption: "Local storage keys used by Kiungo",
      },
      { type: "h2", text: "Cookies set by others" },
      {
        type: "p",
        text: "If you sign in, Google Identity Services may set cookies on Google's own domains to run the sign-in. Those cookies belong to Google and are described in [Google's cookie policy](https://policies.google.com/technologies/cookies). You can use Kiungo without signing in, in which case no third-party code runs.",
      },
      { type: "h2", text: "Clearing it" },
      {
        type: "p",
        text: "Clear site data for Kiungo in your browser's settings to remove everything above. Your projects and records are included, so export a report first if you want to keep them.",
      },
      { type: "h2", text: "Contact" },
      { type: "p", text: CONTACT },
    ],
  },
];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug);
}
