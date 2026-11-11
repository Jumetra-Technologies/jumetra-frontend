import type { Block } from "@/lib/learning/types";

/**
 * Legal documents linked from the site footer.
 *
 * These are drafts written to match how Kiungo works today (browser storage,
 * Google sign-in, a backend that can drive real hardware). Each page shows a
 * notice that they are not yet in force until Kiungo Labs Technologies has
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
  "This is a draft prepared for review by Kiungo Labs Technologies. It describes how Kiungo works today and is not yet in force.";

const CONTACT = "Questions go to Kiungo Labs Technologies through [github.com/Jumetra-Technologies](https://github.com/Jumetra-Technologies).";

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
        text: "Kiungo (formerly HHIP, the Universal Hybrid Hardware Simulation System) is a web platform made by Kiungo Labs Technologies for learning, simulating and building robotics and IoT projects. It is in its first phase, a proof of concept. Features may change, move or be removed as the platform develops.",
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
        text: "Projects, circuits, code, experiment records and reports you create are yours. Kiungo Labs Technologies does not claim ownership of them. Where Kiungo stores them on your behalf, you give us permission to keep, display and process them so the platform can work, and nothing more.",
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
        text: "Kiungo is provided as it is, without warranties of any kind. We do not promise that it will be available, accurate or free of errors, or that simulated behavior matches real components. To the extent the law allows, Kiungo Labs Technologies is not liable for loss or damage arising from your use of Kiungo, including damage to hardware.",
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
    revised: "2026-11-11",
    blocks: [
      { type: "h2", text: "Accounts" },
      {
        type: "p",
        text: "You don't need an account to use Kiungo: projects, the Engineering Lab and experiment records all work without one. Sign in with a supported provider to save your work, and for the few things done only for an account, such as adding teammates to a project. Kiungo receives the profile details needed to identify your account; your provider password is never shared with Kiungo.",
      },
      { type: "h2", text: "Where your work lives" },
      {
        type: "ul",
        items: [
          "Signed in, your projects, experiment records and Engineering Lab sessions are saved to your account. Lab sessions are also kept in your browser, so the lab opens without waiting.",
          "Without signing in, they are kept only in the page you have open, and are gone when you close or reload it. Signing in before then saves them to your account.",
          "Reports are generated as files when you export them. Some lab and device features communicate with Kiungo services while in use.",
          "Your sign-in session, learning progress and theme choice are saved in your browser.",
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
        text: "Anything you upload stays yours. By uploading it you confirm you have the right to, and you give Kiungo Labs Technologies a license to store and process it so Kiungo can show it back to you and to anyone you share it with. That license ends when you delete the content or close your account, except for copies in routine backups, which expire on their own.",
      },
      { type: "h2", text: "Closing your account" },
      {
        type: "p",
        text: "Ask us to close your account at any time. We will remove your account record and the data tied to it from Kiungo's servers within 30 days. You can clear browser-stored sign-in and preference data by clearing site data for Kiungo.",
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
          "Report bugs, security problems and unsafe behavior you notice.",
        ],
      },
      { type: "h2", text: "Don't" },
      {
        type: "ul",
        items: [
          "Use Kiungo to control hardware that could injure someone or damage property without the safeguards a competent person would expect: fuses, current limits, emergency stops, supervision.",
          "Upload or run firmware designed to damage a board, bypass its protections, or attack other devices or networks.",
          "Probe, overload or interfere with Kiungo's servers or other users' sessions.",
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
        text: "We may remove content, suspend accounts or block access to Kiungo to stop a breach of this policy. Serious or repeated breaches may lead to a closed account. Where we can, we will tell you what happened and why.",
      },
      { type: "h2", text: "Contact" },
      { type: "p", text: CONTACT },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What Kiungo collects, why, where it is kept, and your choices.",
    revised: "2026-11-11",
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
          ["Name, email address, profile picture", "Your sign-in provider", "To identify you inside Kiungo", "Kiungo's servers and sign-in session in your browser"],
          ["Projects, experiment records", "You", "So you can plan and document your work", "Your signed-in account. Without signing in: only the page you have open, until you close or reload it; nothing is sent to Kiungo"],
          ["Reports", "You, when exporting", "To keep or share a copy of your work", "A file downloaded to your device"],
          ["Engineering Lab sessions (parts, wires, settings and log)", "You, while using the Engineering Lab", "To run and explore designs, and to come back to them", "Your signed-in account, and your browser's local storage for that account. Without signing in: only the page you have open, until you close or reload it; nothing is sent to Kiungo"],
          ["Theme, sidebar state, learning progress", "You", "To remember your preferences", "Your browser's local storage only"],
          ["Technical logs (requests, errors)", "Your browser's requests to Kiungo", "To keep Kiungo running and find faults", "Kiungo's servers, for a limited time"],
          ["Usage, only if you allow it: which page is open, and how long Kiungo is in use each day", "The website while its tab is visible and you're using it, after you choose Allow in the banner or in Settings, Privacy", "So Kiungo's team can see how much Kiungo is used, which pages matter most and who is online, and plan from that. Your consent is the basis; you can withdraw it any time", "Kiungo's servers, as daily totals for 400 days, tied to a random id your browser makes, never your name. Saying no deletes what was counted for your browser. Details in the [Cookie Policy](/legal/cookies)"],
        ],
        caption: "Everything Kiungo collects",
      },
      { type: "h2", text: "What we don't do" },
      {
        type: "ul",
        items: [
          "We don't sell your data or share it with advertisers.",
          "We don't run advertising or third-party analytics on Kiungo. The usage figures above are counted by Kiungo's own servers and seen only by Kiungo's team.",
          "We don't record what you type, click or build to measure usage: only which page is open and for how long.",
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
          "Sign out or clear browser-stored sign-in and preference data by clearing site data for Kiungo.",
          "Ask us to close your account and remove the data tied to it. See the [User Agreement](/legal/user-agreement).",
          "Ask us what we hold about you, and to correct it.",
          "Allow or stop usage counting any time in Settings, Privacy. Stopping deletes what was counted for you.",
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
    summary: "The cookies and browser storage Kiungo uses, and the usage it counts only if you allow it.",
    revised: "2026-11-09",
    blocks: [
      {
        type: "p",
        text: "This policy covers three things: the two cookies that keep you signed in, what Kiungo keeps in your browser, and the usage Kiungo counts for its team: which pages you open and how long you spend on the website. That last part happens only if you allow it.",
      },
      { type: "h2", text: "In short" },
      {
        type: "ul",
        items: [
          "Kiungo sets two cookies, only to keep you signed in.",
          "Kiungo counts which pages you open and how long you use the website only after you choose **Allow**, and never by name. Until you choose, nothing is counted.",
          "You can change your answer any time in **Settings, Privacy**. Saying no deletes what was counted for you.",
          "No advertising, no third-party analytics, and nothing is sold or shared.",
        ],
      },
      { type: "h2", text: "Cookies Kiungo sets" },
      {
        type: "p",
        text: "Kiungo's server sets these when you sign in. Your browser sends them back only to that server, and the website's own code can't read them. You can't use an account without them, so they don't need your consent. They aren't used to count usage.",
      },
      {
        type: "table",
        head: ["Cookie", "What it does", "How long"],
        rows: [
          ["`hhip_access`", "Proves to Kiungo's server that you're signed in", "15 minutes, renewed while you use Kiungo"],
          ["`hhip_refresh`", "Keeps you signed in between visits", "30 days, or until you sign out"],
        ],
        caption: "Cookies set by Kiungo's server",
      },
      { type: "h2", text: "Usage counting, with your consent" },
      {
        type: "p",
        text: "Kiungo's team uses these figures to see how much Kiungo is used, which pages matter most and who is using it now, so we know what to improve. They appear in an admin portal that only Kiungo's team can open.",
      },
      { type: "h3", text: "What is counted" },
      {
        type: "ul",
        items: [
          "**Which page you open** on the website, by its address with ids taken out (so `/projects/:id`, never the name of your project).",
          "**How long you spend** on the website while its tab is showing and you've moved, typed or scrolled in the last five minutes. Kiungo keeps the total for each day.",
          "**Whether you're online now:** the page you're on and since when, while Kiungo is open. It's shown to the team as online for two minutes after your last activity.",
          "**Not your name:** these are tied to a random id your browser makes (`kiungo.visitor`), which Kiungo's server scrambles before keeping it, so the team sees how a browser uses Kiungo, not who you are. This is the same whether or not you're signed in.",
        ],
      },
      { type: "h3", text: "What is never counted" },
      {
        type: "ul",
        items: [
          "What you type, build, wire, upload or write: projects, sketches, experiment records and messages.",
          "What you click on a page, how you move the mouse, or recordings of your screen.",
          "Your address on the internet, your location or your device's details.",
        ],
      },
      { type: "h3", text: "How long it's kept, and where" },
      {
        type: "ul",
        items: [
          "Daily totals are kept for 400 days, then deleted.",
          "Where you are now is kept for 30 days after you were last active, then deleted.",
          "They're stored on Kiungo's servers, run for Kiungo by Render (hosting) and Neon (database). These services may be outside Kenya. They store the data for Kiungo and don't use it themselves.",
        ],
      },
      { type: "h3", text: "Your choice" },
      {
        type: "ul",
        items: [
          "The first time you visit, Kiungo asks. **Allow** and **Don't allow** are side by side and work the same way. Until you choose, nothing is counted.",
          "Change your answer any time in **Settings, Privacy** (the gear at the bottom of the sidebar).",
          "Saying **Don't allow**, now or later, stops the counting. It also deletes the time and online status counted for your browser. The page totals don't name anyone, so they stay.",
          "Your answer is kept in this browser, so each browser you use asks once. The desktop app doesn't send usage at the moment.",
          "If you're under 18, ask a parent, guardian or teacher before you choose **Allow**.",
        ],
      },
      { type: "h2", text: "What Kiungo keeps in your browser" },
      {
        type: "p",
        text: "These keep Kiungo working and remember your preferences. They aren't cookies and aren't sent anywhere, apart from the sign-in token, which goes to Kiungo's server with each request.",
      },
      {
        type: "table",
        head: ["Key", "What it holds", "How long"],
        rows: [
          ["`hhip-auth-session`", "Your sign-in token and profile", "Until you sign out or clear site data"],
          ["`hhip-account`", "Account display details for the sidebar", "Until you sign out or clear site data"],
          ["`kiungo.lab:v2:<account>`", "Your Engineering Lab sessions (parts, wires, settings and log), one entry per signed-in account, shown only to that account", "Until you delete the sessions or clear site data"],
          ["`hhip-learning-progress:v1`", "Which learning modules you have marked complete", "Until you clear site data"],
          ["`hhip-lab-sound`", "Whether the Engineering Lab's sounds are on", "Until you change it or clear site data"],
          ["`kiungo-diagnostics`", "A short log of failed requests and errors on this device, for administrators' System Diagnostics; it never leaves the browser", "The newest 300 requests and 150 errors; until you clear site data"],
          ["`kiungo.consent.usage`", "Your answer about usage counting, and when you gave it", "Until you change it or clear site data"],
          ["`kiungo.visitor`", "Only after you allow usage counting: a random id for this browser, so usage while signed out can be counted without knowing who you are", "Until you clear site data"],
          ["`hhip-theme`", "Your chosen theme", "Until you change it or clear site data"],
          ["`hhip-sidebar-collapsed`", "Whether the sidebar is collapsed", "Until you change it or clear site data"],
        ],
        caption: "Local storage keys used by Kiungo",
      },
      {
        type: "table",
        head: ["Key", "What it holds", "How long"],
        rows: [
          ["`hhip-firmware-studio:v1`", "The Firmware page's last list of your projects and starters, so the page opens quickly", "Until you close the tab"],
          ["`kiungo-system-unlocked`", "Whether this tab opened System Diagnostics", "Until you close the tab"],
          ["`kiungo.admin.session`", "The admin portal's sign-in, for Kiungo's team only", "30 minutes, or until you close the tab or sign out of the portal"],
        ],
        caption: "Session storage keys used by Kiungo (cleared when the tab closes)",
      },
      { type: "h2", text: "Cookies set by others" },
      {
        type: "p",
        text: "If you sign in with Google or GitHub, the sign-in runs through Google's Firebase Authentication, which may set cookies on Google's and GitHub's own domains. Those belong to them and are described in [Google's cookie policy](https://policies.google.com/technologies/cookies) and GitHub's. You can use Kiungo without signing in, and then no third-party code runs.",
      },
      { type: "h2", text: "Clearing it" },
      {
        type: "p",
        text: "Clearing site data for Kiungo in your browser's settings removes everything kept in your browser, including your answer about usage counting, so Kiungo asks again. It also removes Engineering Lab sessions saved only in this browser. Projects and experiment records are saved to your account and stay. Clearing site data doesn't delete usage already counted; to do that, choose **Don't allow** in Settings, Privacy first.",
      },
      { type: "h2", text: "Changes" },
      {
        type: "p",
        text: "If Kiungo starts counting anything this policy doesn't describe, we'll update it and ask you again before counting it.",
      },
      { type: "h2", text: "Contact" },
      { type: "p", text: CONTACT },
    ],
  },
];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug);
}
