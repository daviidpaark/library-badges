# Library Badges

A userscript that shows, while you browse music sites, Letterboxd and YouTube, whether you already have an album, film or video in your self-hosted libraries, and gets you to it or to a download in one click.

- **Item pages** (an album, film or video) get a row of badges under the title: one per library, with details such as quality or watched state.
- **List pages** (charts, discographies, filmographies, watchlists, feeds, search results) mark every item: library icons for what you have, the Radarr or Sonarr icon for what's on its way, and a ↓ download button for what you're missing.
- A **counter** in the corner sums up the page, for example "34 of 40 on this page in your library · 3 on the way", and lists the items.

Libraries: Navidrome, Plex, Jellyfin, Spotify (through [spicetify-library](https://github.com/daviidpaark/spicetify-library)). Downloads and requests: Radarr, Sonarr, Deemix, Tidarr, slskd and Bandcamp. Nothing is ever requested, downloaded or bought automatically; every link opens the right page, where you start it yourself.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Open [`library-badges.user.js`](https://raw.githubusercontent.com/daviidpaark/library-badges/main/library-badges.user.js) and confirm the install.
3. Open any supported page and click **⚙ Set up Library Badges** under the title, or choose **Library Badges → Settings** in the userscript manager's menu.
4. Fill in the services you use and press **Test** next to each one. **Save** reloads the page.
5. The first request to each server asks you to allow the domain. Choose **Always allow domain**.

## Supported sites

| Media | Sites | Matched by |
| --- | --- | --- |
| Albums | RateYourMusic, MusicBrainz, Bandcamp, Album of the Year, Discogs, [The Fork](https://the-fork.vercel.app/), [The Drop](https://the-drop-reviews.vercel.app/) | Spotify album ID (RateYourMusic), MusicBrainz ID (MusicBrainz), otherwise artist and title |
| Films and shows | Letterboxd | TMDB ID on film pages; title and year on lists, with a match one year off confirmed against the film's TMDB ID |
| YouTube videos | YouTube | Video ID (see [YouTube libraries](#youtube-libraries)) |

Every site gets badges on its item pages and icons on its list pages. On Discogs, each album is marked once: its expanded versions and the version tables on master and release pages are left alone. The Fork and The Drop have no album pages, so their review dialog gets the badges.

## Item pages

Each configured library gets a badge under the title:

| Badge | Meaning |
| --- | --- |
| **✓** green outline | In that library. Click to open it in its player. |
| **✕** grey | Not found. Click to search that library, in case it's there under another name. The Spotify badge opens the album on Spotify when the page links it. |
| **↗** dashed outline | A link to download, add or buy it (see below). |
| **!** red outline | The server couldn't be reached or refused the request. Hover for the reason. |

Owned items add details to their badge:

- **Films:** quality, size, whether you've watched it, and for a foreign-language film its audio language and whether English subtitles are there, for example "1080p · 11.3 GB · Japanese audio · EN subs · watched". On Letterboxd, with your username set, a film you've watched but haven't logged is noted as "not logged on Letterboxd".
- **Shows:** the seasons and episodes you have.

Download and request links:

- **Albums missing from Navidrome** link to Deemix and Tidarr (straight to the album when the page links it on Deezer or Tidal, otherwise to a search), to slskd's search page and, when turned on, to a Bandcamp search where you can buy it.
- **Films missing from every library** link to Radarr's movie or add page. With an API key the badge shows Radarr's state, such as "Not added", "Monitored, missing" or "Downloading 43%".
- **Films you only have in 720p or SD** link to Radarr to look for a better copy ("upgrade from 720p").
- **Shows** always link to Sonarr, which says how complete the show is ("Complete, 62 episodes" or "50/62 episodes, 12 missing").

## List pages

Every item on a list page gets one of three marks, in the corner of its cover or poster, or after its title when the cover is too small:

| Mark | Meaning |
| --- | --- |
| Library icons | You have it. Click an icon to open it there. Films, shows and videos you've watched add a green **✓**; a show Sonarr says is missing episodes adds how many you have, such as "50/62". |
| Radarr or Sonarr icon, dashed | Not in your library yet, but Radarr or Sonarr has it, so it's on its way. Dimmed when it isn't monitored. Needs the service's API key. |
| **↓**, dashed | Missing. Opens it in your default downloader; **▾** next to it lists the others. Albums use Deemix, Tidarr, slskd or Bandcamp, films Radarr, shows Sonarr. |

Albums you have elsewhere but not in Navidrome, where downloads land, get both their library icons and the ↓.

The **counter** in the bottom-right corner shows how many items on the page you have and how many are on the way. On a Letterboxd director's, actor's or list page, that's how complete it is in your library. Click it to list the page's items, grouped as in your library, on the way and missing:

- Filter to one group with the buttons at the top.
- **Copy missing** copies what you still need, one per line as the page names it (for example "Artist – Album" or "Title (Year)"), for pasting into a search.
- Click a name to scroll to it on the page.

## Settings

| Section | Fields | Notes |
| --- | --- | --- |
| Navidrome | Server URL, username, password, where to open albums | Uses the Subsonic API. Albums open in Navidrome's web UI or in Feishin web. |
| Plex | Server URL, token | The server's own address (for example `https://plex.example.com:32400`), not app.plex.tv. See [Finding your Plex token](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/). |
| Jellyfin | Server URL, API key, optional username | Create a key in **Dashboard → API Keys**. Watched state is read for that user, or the first administrator. |
| Spotify | Spicetify Library URL | The read-only address of [spicetify-library](https://github.com/daviidpaark/spicetify-library). |
| Radarr, Sonarr | URL, optional API key | The key adds each film's or show's state, and the "on its way" icons on list pages. |
| Deemix, Tidarr, slskd | URL | Only linked to. |
| Bandcamp | On or off | Adds a Bandcamp search to albums missing from Navidrome. |
| Letterboxd | Username | Notes watched films you haven't logged. |
| Display | Film details, icons on lists, ↓ on missing items, default album downloader, page counter, covers you have | Hide what you don't need, choose which downloader the ↓ opens first, and optionally dim the covers of items you have so new things stand out (hover to see them). |

Leave a service empty to turn it off. Settings, including passwords and tokens, stay in the userscript manager's storage and are only sent to the server they belong to. Use addresses your browser can reach wherever you use it.

You can use download or request links without configuring a library; ownership badges require a configured library.

- **Library gaps**, at the bottom of the settings, lists what each library is missing compared with the others, for example albums in Navidrome that aren't saved in Spotify.
- **Export settings** and **Import settings** in the userscript menu copy every setting (including passwords and tokens) to another browser through the clipboard.

## How matching works

### The library index

Pages match against an index of each whole library, built the first time you open a supported page (a few seconds) and cached for six hours. Every 15 minutes a quick check looks at the newest addition, and for films and videos the newest watch, and rebuilds the index in the background when something changed. **Refresh library index** in the userscript menu rebuilds it right away.

Radarr's and Sonarr's lists, used for the "on its way" icons, are cached for 30 minutes. Clicking a film's or show's ↓ expires that cache, so after adding it and coming back to the tab the icon updates.

### Grouping across services

Copies of the same item on different services are grouped by MusicBrainz, TMDB, IMDb or TVDB ID (as written by Picard, beets, Plex and Jellyfin), by matching artist and title, or by a title only one album has on each service. So an album shows every service that has it, even when Plex credits "Various Artists" or Spotify credits the composer.

### Title matching

Titles are compared without the wording that varies between editions and services:

- edition and remaster notes: "(Deluxe Edition)", "(2004 Remastered)", "45th Anniversary", ": Tenth Anniversary Edition", "(B Sides)", so a standard edition and its expanded one match either way round;
- soundtrack wording such as "(Original Game Soundtrack)", "(Original Music For The Film By …)" or a trailing "Soundtrack", and "(feat. …)" suffixes;
- full-width characters;
- a leading artist name ("Gingerbee at Thalia Hall" matches "At Thalia Hall");
- "Live at" wording in a subtitle ("A Night at the Symphony: Live at the Hollywood Bowl" matches "…: Hollywood Bowl").

Artists named differently from the library still match the same title: a full name finds the library's shorter one ("Stella Katherine Cole" finds "Stella Cole", "Samia Finnerty" finds "Samia"), a family name written first finds the usual order ("Aoba Ichiko" finds "Ichiko Aoba"), a library name with a disambiguation suffix is found without it ("Ugly" finds "Ugly (UK)"), and a compilation credited to "Various" finds the one album in your library with that title. A release that combines two ("Towards The End / Where To Find Me", "Folklore I & II") counts when you have either part, and a title also finds a longer library title by the same artist that ends with it ("Louder, Please" finds "A Little Louder, Please").

When no title matches exactly, an album by the same artist whose title continues the page's title counts too, so "BRAT" finds "Brat and it's completely different but also still brat". A separate remix, instrumental, a cappella, live or demo album ("Mordechai Remixes") never stands in for the original.

### YouTube libraries

Videos downloaded with yt-dlp into a Plex or Jellyfin movie library are recognized by the video ID in brackets at the start or end of the file name, for example `[dQw4w9WgXcQ] Title.mkv` or `Title [dQw4w9WgXcQ].mkv` (yt-dlp's default). Jellyfin's YouTube metadata plugin ID works too. These videos are kept out of the film index.

## Icons

- Navidrome, Plex, Tidarr and slskd icons from [selfh.st/icons](https://github.com/selfhst/icons), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Jellyfin, Spotify, Radarr, Sonarr, Bandcamp, Letterboxd and Deezer (used for Deemix) icons from [Simple Icons](https://github.com/simple-icons/simple-icons), licensed under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

All product names and logos are trademarks of their respective owners.

## AI Disclosure

> [!NOTE]
> This is a personal homelab project developed with the assistance of **Claude Code (Claude Opus)**. It is shared publicly for other self-hosters. Feedback and issue reports are welcome.

## License

[MIT License](LICENSE) © 2026 David Park
