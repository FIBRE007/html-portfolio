/**
 * THE ASSEMBLY OF SONS — Site configuration
 * Edit the values below to update the whole site. Nothing else in the
 * codebase should hard-code these values.
 */
const CONFIG = {
  // Public base URL of the Cloudflare R2 bucket folder that holds the audio
  // files. Every chapter URL is built from this single value.
  audioBaseUrl: "https://pub-REPLACE-WITH-YOUR-R2-ID.r2.dev/tlog/",

  telegramUrl: "https://t.me/+_tnZiaSEX9liOGY8",
  whatsappUrl: "https://chat.whatsapp.com/JfFxXPzcyvfCGr85Uw5oc0?s=cl&p=a&ilr=4",

  donationMethod: "OPay",
  donationAccount: "8151812207",
  donationName: "Fadoju Tosin",

  siteUrl: "https://theassemblyofsons.com",
};

/**
 * The 13 sections of the audio book. `file` is joined to CONFIG.audioBaseUrl
 * to build the streaming URL — see AUDIO_BASE_URL / chapter.file usage in
 * assets/js/audio-player.js.
 */
const CHAPTERS = [
  { number: "00", slug: "front-matter", title: "Front Matter", file: "00_front_matter.mp3" },
  { number: "01", slug: "chapter-one", title: "Chapter One", file: "01_chapter_one.mp3" },
  { number: "02", slug: "chapter-two", title: "Chapter Two", file: "02_chapter_two.mp3" },
  { number: "03", slug: "chapter-three", title: "Chapter Three", file: "03_chapter_three.mp3" },
  { number: "04", slug: "chapter-four", title: "Chapter Four", file: "04_chapter_four.mp3" },
  { number: "05", slug: "chapter-five", title: "Chapter Five", file: "05_chapter_five.mp3" },
  { number: "06", slug: "chapter-six", title: "Chapter Six", file: "06_chapter_six.mp3" },
  { number: "07", slug: "chapter-seven", title: "Chapter Seven", file: "07_chapter_seven.mp3" },
  { number: "08", slug: "chapter-eight", title: "Chapter Eight", file: "08_chapter_eight.mp3" },
  { number: "09", slug: "chapter-nine", title: "Chapter Nine", file: "09_chapter_nine.mp3" },
  { number: "10", slug: "chapter-ten", title: "Chapter Ten", file: "10_chapter_ten.mp3" },
  { number: "11", slug: "chapter-eleven", title: "Chapter Eleven", file: "11_chapter_eleven.mp3" },
  { number: "12", slug: "conclusion", title: "Conclusion", file: "12_conclusion.mp3" },
];

// Example of the dynamic URL construction referenced throughout the app:
// const audioUrl = CONFIG.audioBaseUrl + chapter.file;
