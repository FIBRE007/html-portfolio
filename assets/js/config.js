/**
 * THE ASSEMBLY OF SONS — Site configuration
 * Edit the values below to update the whole site. Nothing else in the
 * codebase should hard-code these values.
 */
const CONFIG = {
  // Public base URL of the Cloudflare R2 bucket. Every chapter URL is built
  // from this single value — no MP3s live in this repo.
  audioBaseUrl: "https://pub-62419141416c46ffa27f7d6399c14d04.r2.dev/",

  telegramUrl: "https://t.me/+_tnZiaSEX9liOGY8",
  whatsappUrl: "https://chat.whatsapp.com/JfFxXPzcyvfCGr85Uw5oc0?s=cl&p=a&ilr=4",

  donationMethod: "OPay",
  donationAccount: "8151812207",
  donationName: "Fadoju Tosin",

  siteUrl: "https://theassemblyofsons.com",

  // Formspree endpoint for the "Reader Reviews" submission form (see
  // assets/js/main.js).
  reviewFormEndpoint: "https://formspree.io/f/xgawlvaa",
};

/**
 * Curated reader reviews shown in the "What Readers Are Saying" section.
 * Submissions come in via the review form above (to your email through
 * Formspree) — add the ones you want published here. Each entry:
 *   { name: "Reader Name", location: "City, Country" (optional), text: "..." }
 */
const REVIEWS = [];

/**
 * The 13 sections of the audio book. `file` is joined to CONFIG.audioBaseUrl
 * to build the streaming URL — see AUDIO_BASE_URL / chapter.file usage in
 * assets/js/audio-player.js.
 */
const CHAPTERS = [
  { number: "00", slug: "front-matter", title: "Front Matter", subtitle: "", file: "00_00_Front_Matter.mp3" },
  { number: "01", slug: "chapter-one", title: "Chapter One", subtitle: "The World You Cannot See", file: "01_Chapter_One_The_World_You_Cannot_See.mp3" },
  { number: "02", slug: "chapter-two", title: "Chapter Two", subtitle: "The Fourth Dimension: God's Kingdom", file: "02_Chapter_Two_The_Fourth_Dimension_God_s_Kingdom.mp3" },
  { number: "03", slug: "chapter-three", title: "Chapter Three", subtitle: "The Rebellion and the Throne", file: "03_Chapter_Three_The_Rebellion_and_the_Throne.mp3" },
  { number: "04", slug: "chapter-four", title: "Chapter Four", subtitle: "The Finished Work of Christ", file: "04_Chapter_Four_The_Finished_Work_of_Christ.mp3" },
  { number: "05", slug: "chapter-five", title: "Chapter Five", subtitle: "The New Creation", file: "05_Chapter_Five_The_New_Creation.mp3" },
  { number: "06", slug: "chapter-six", title: "Chapter Six", subtitle: "The Renewed Mind", file: "06_Chapter_Six_The_Renewed_Mind.mp3" },
  { number: "07", slug: "chapter-seven", title: "Chapter Seven", subtitle: "Living by Faith", file: "07_Chapter_Seven_Living_by_Faith.mp3" },
  { number: "08", slug: "chapter-eight", title: "Chapter Eight", subtitle: "Living Confidently in God's Timing", file: "08_Chapter_Eight_Living_Confidently_in_God_s_Timing.mp3" },
  { number: "09", slug: "chapter-nine", title: "Chapter Nine", subtitle: "Thanksgiving, Peace and Rest", file: "09_Chapter_Nine_Thanksgiving_Peace_and_Rest.mp3" },
  { number: "10", slug: "chapter-ten", title: "Chapter Ten", subtitle: "Living to Please the Father", file: "10_Chapter_Ten_Living_to_Please_the_Father.mp3" },
  { number: "11", slug: "chapter-eleven", title: "Chapter Eleven", subtitle: "Shining as Sons", file: "11_Chapter_Eleven_Shining_as_Sons.mp3" },
  { number: "12", slug: "conclusion", title: "Conclusion", subtitle: "Living Every Day from God's Perspective", file: "12_Conclusion_Living_Every_Day_from_God_s_Perspective.mp3" },
];

// Example of the dynamic URL construction referenced throughout the app:
// const audioUrl = CONFIG.audioBaseUrl + chapter.file;
