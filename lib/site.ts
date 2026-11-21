const fallbackUrl = "https://surajadh.pages.dev";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || fallbackUrl).replace(
  /\/$/,
  "",
);

export const siteName = "Suraj Adhikari";
export const siteTitle =
  "Suraj Adhikari — C++, Systems & Compiler Engineer in Nepal";
export const siteDescription =
  "Suraj Adhikari is a C++ and systems engineer in Kathmandu, Nepal, building Sajilo, a programming language with Nepali keywords, and its compiler. Systems programming, networking and performance work, available remotely worldwide.";
