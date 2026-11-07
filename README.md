# Library Badges

A userscript (and [Spotify desktop extension](#spotify-desktop-app)) that shows, while you browse music sites, Spotify, Letterboxd and YouTube, whether you already have an album, film or video in your self-hosted libraries, and gets you to it or to a download in one click.

- **Item pages** (an album, film or video) get a row of badges under the title: one per library, with details such as quality or watched state.
- **List pages** (charts, discographies, filmographies, watchlists, feeds, search results) mark every item: library icons for what you have, the Radarr or Sonarr icon for what's on its way, and a ↓ download button for what you're missing.
- A **counter** in the corner sums up the page, for example "34 of 40 on this page in your library · 3 on the way", and lists the items.

Libraries: Navidrome, Plex, Jellyfin, Spotify (through [spicetify-library](https://github.com/daviidpaark/spicetify-library)). Downloads and requests: Radarr, Sonarr, Deemix, Tidarr, slskd and Bandcamp. Nothing is ever requested, downloaded or bought automatically; every link opens the right page, where you start it yourself.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Open [`library-badges.user.js`](https://raw.githubusercontent.com/daviidpaark/library-badges/main/library-badges.user.js) and confirm the install.
3. Open any supported page and click **⚙ Set up Library Badges** under the title, or choose **Settings** in the **Library Badges menu** (the userscript manager's menu; in Spotify's desktop app, the profile menu).
4. Fill in the services you use and press **Test** next to each one. **Save** reloads the page.
5. The first request to each server asks you to allow the domain. Choose **Always allow domain**.

### Spotify desktop app

The same file also works as a [Spicetify](https://spicetify.app/) extension, with the same badges on album pages, cards and Your Library inside Spotify's desktop app, and on the album cards of the [Random Library](https://github.com/daviidpaark/random-library) and [Release List](https://github.com/daviidpaark/release-list) apps.

1. Copy `library-badges.user.js` to the `Extensions` folder inside `spicetify path userdata`, named `library-badges.js`.
2. Run `spicetify config extensions library-badges.js`, then `spicetify apply`.
3. Bring your settings over: **Export settings** in the browser, then in Spotify's profile menu **Library Badges → Import settings** (it reads the clipboard).

Servers need **https** addresses inside Spotify; a plain `http://` one (such as Plex on `http://server:32400`) shows an error badge. To update, copy the new file over the old one and run `spicetify apply` again.

### Your Deemix, Tidarr and Spicetify Library

Their addresses are your own, so the script can't list them. Add them once: in Violentmonkey, open the script, go to its **Settings** tab and add them to the custom **@match** rules (Tampermonkey: **Settings → User matches**), one line per server, for example `http://192.168.1.100:6595/*` and `http://192.168.1.100:8484/*`, plus Spicetify Library's read-only address. They must match the Deemix, Tidarr and Spicetify Library URLs in Library Badges' settings, and they're kept when the script updates.

## Supported sites

| Media | Sites | Matched by |
| --- | --- | --- |
| Albums | RateYourMusic, MusicBrainz, Bandcamp, Album of the Year, Discogs, Spotify (web player and [desktop app](#spotify-desktop-app)), [The Fork](https://the-fork.vercel.app/), [The Drop](https://the-drop-reviews.vercel.app/), and your own Deemix, Tidarr and Spicetify Library | Spotify album ID (RateYourMusic, Spotify, Spicetify Library), MusicBrainz ID (MusicBrainz), otherwise artist and title |
| Films and shows | Letterboxd | TMDB ID on film pages; title and year on lists, with a match one year off confirmed against the film's TMDB ID |
| YouTube videos | YouTube | Video ID (see [YouTube libraries](#youtube-libraries)) |

Every site gets badges on its item pages and icons on its list pages. Each album is marked once: Discogs' expanded versions and version tables are left alone, and RateYourMusic's Issues lists and MusicBrainz release groups only mark the digital version closest to each library's copy (the same title, then the same edition wording, then the first listed, which on RateYourMusic is the primary issue). On MusicBrainz, a copy tagged with a release ID marks that exact release, whatever its format. The Fork and The Drop have no album pages, so their review dialog gets the badges.

Your own Deemix and Tidarr get badges too, so you can see what you already have before downloading it: album pages get the library badges, and search results, artist pages and Deemix's charts and favorites mark each album. Download links there leave out the downloader you're on. [Spicetify Library](https://github.com/daviidpaark/spicetify-library) marks the albums in its library, Discover and Release List tabs. These need their addresses added once (see [Your Deemix, Tidarr and Spicetify Library](#your-deemix-tidarr-and-spicetify-library)).

## Item pages

Each configured library gets a badge under the title:

| Badge | Meaning |
| --- | --- |
| **✓** green outline | In that library. Click to open it in its player. |
| **?** amber, dashed | Navidrome only. Not sure: Navidrome probably has it under another credit or title (see [Not sure](#not-sure)). Click to open that album and check. |
| **✕** grey | Not found. Click to search that library, in case it's there under another name. The Spotify badge opens the album on Spotify when the page links it. |
| **↗** dashed outline | A link to download, add or buy it (see below). |
| **!** red outline | The server couldn't be reached or refused the request. Hover for the reason. |

Owned items add details to their badge:

- **Films:** quality, size, whether you've watched it, and for a foreign-language film its audio language and whether English subtitles are there, for example "1080p · 11.3 GB · Japanese audio · EN subs · watched". On Letterboxd, with your username set, a film you've watched but haven't logged is noted as "not logged on Letterboxd".
- **Shows:** the seasons and episodes you have.

Download and request links show whether or not you have the item, so every service is a click away:

- **Albums** link to Deemix and Tidarr (straight to the album when the page links it on Deezer or Tidal, otherwise to a search), to slskd's search page and, when turned on, to a Bandcamp search where you can buy it.
- **Films** link to Radarr's movie or add page. With an API key the badge shows Radarr's state, such as "Downloaded (Bluray-1080p)", "Not added", "Monitored, missing" or "Downloading 43%". A film you only have in 720p or SD adds "upgrade from 720p".
- **Shows** link to Sonarr, which says how complete the show is ("Complete, 62 episodes" or "50/62 episodes, 12 missing").

## List pages

Every item on a list page gets one of these marks, in the corner of its cover or poster, or after its title when the cover is too small:

| Mark | Meaning |
| --- | --- |
| Library icons | You have it. Click an icon to open it there. Films, shows and videos you've watched add a green **✓**; a show Sonarr says is missing episodes adds how many you have, such as "50/62". |
| Radarr or Sonarr icon, dashed | Not in your library yet, but Radarr or Sonarr has it, so it's on its way. Dimmed when it isn't monitored. Needs the service's API key. |
| Navidrome icon and **?**, amber, dashed | Not sure: Navidrome probably has it under another credit or title (see [Not sure](#not-sure)). Click to open that album and check. It sits in front of the ↓ when there is one. |
| **↓**, dashed | Missing. Opens it in your default downloader; **▾** next to it lists the others. Albums use Deemix, Tidarr, slskd or Bandcamp, films Radarr, shows Sonarr. Letterboxd posters offer both Radarr and Sonarr, since they don't say which an item is. |

Albums you have elsewhere but not in Navidrome, where downloads land, get both their library icons and the ↓.

The **counter** in the bottom-right corner shows how many items on the page you have and how many are on the way (items Radarr or Sonarr has but doesn't monitor count as missing). An album counts as yours once it's in Navidrome, where downloads land; one you only have elsewhere counts as missing, with its library icons in the list. Films, shows and videos count when any library has them. On a Letterboxd director's, actor's or list page, that's how complete it is in your library. Click it to list the page's items, grouped as in your library, on the way, not sure and missing:

- **Search** narrows the list to names containing what you type.
- The **library menu** shows only items in, or not in, one library (for example "Not in Navidrome" for what to download), or on film pages what you have or haven't watched.
- Sort by **page order** or **A–Z**.
- The buttons under the search show one group, with counts that follow the search and menu.
- **Copy list** copies exactly what's shown, one per line as the page names it (for example "Artist – Album" or "Title (Year)"), for pasting into a search.
- Click a name to scroll to it on the page; it flashes an outline so it's easy to spot.

## Settings

| Section | Fields | Notes |
| --- | --- | --- |
| Navidrome | Server URL, username, password, where to open albums | Uses the Subsonic API. Albums open in Navidrome's web UI or in Feishin web. |
| Plex | Server URL, token | The server's own address (for example `https://plex.example.com:32400`), not app.plex.tv. See [Finding your Plex token](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/). |
| Jellyfin | Server URL, API key, optional username | Create a key in **Dashboard → API Keys**. Watched state is read for that user, or the first administrator. |
| Spotify | Spicetify Library URL | The read-only address of [spicetify-library](https://github.com/daviidpaark/spicetify-library). |
| Radarr, Sonarr | URL, optional API key | The key adds each film's or show's state, and the "on its way" icons on list pages. |
| Deemix, Tidarr, slskd | URL | Linked to. Deemix and Tidarr also get badges once you add their addresses to the script's matches (see [Your Deemix, Tidarr and Spicetify Library](#your-deemix-tidarr-and-spicetify-library)). |
| Bandcamp | On or off | Adds a Bandcamp search link: on album pages always, on list pages to albums missing from Navidrome. |
| Letterboxd | Username | Notes watched films you haven't logged. |
| Display | Film details, icons on lists, ↓ on missing items, default album downloader, page counter, covers you have | Hide what you don't need, choose which downloader the ↓ opens first, and optionally dim the covers of items you have so new things stand out (hover to see them). |

Leave a service empty to turn it off. Saved passwords, tokens and API keys show as blank in the form; leave them blank to keep them. Settings, including passwords and tokens, stay in the userscript manager's storage (in Spotify's desktop app, the app's own storage) and are only sent to the server they belong to. Use addresses your browser can reach wherever you use it.

You can use download or request links without configuring a library; ownership badges require a configured library.

- **Library gaps**, at the bottom of the settings, lists what each library is missing compared with the others, for example albums in Navidrome that aren't saved in Spotify.
- **Export settings** and **Import settings** in the Library Badges menu copy every setting (including passwords and tokens) to another browser through the clipboard.

## How matching works

### The library index

Pages match against an index of each whole library, built the first time you open a supported page (a few seconds) and cached for six hours. Every 15 minutes a quick check looks at the newest addition, and for films and videos the newest watch, and rebuilds the index in the background when something changed. If a service can't be reached, the last good index stays and the rebuild is retried every 15 minutes. **Refresh library index** in the Library Badges menu rebuilds it right away.

Radarr's and Sonarr's lists, used for the "on its way" icons, are cached for 30 minutes. Clicking a film's or show's ↓ expires that cache, so after adding it and coming back to the tab the icon updates.

### Grouping across services

Copies of the same item on different services are grouped by MusicBrainz, TMDB, IMDb or TVDB ID (as written by Picard, beets, Plex and Jellyfin), by matching artist and title, or by a title only one album has on each service, when they share an artist or one is credited to "Various Artists". So an album shows every service that has it, even when Plex credits "Various Artists".

### Title matching

Titles are compared without the wording that varies between editions and services:

- edition and remaster notes: "(Deluxe Edition)", "(2004 Remastered)", "45th Anniversary", ": Tenth Anniversary Edition", "(B Sides)", so a standard edition and its expanded one match either way round;
- soundtrack wording such as "(Original Game Soundtrack)", "(Original Music For The Film By …)" or a trailing "Soundtrack", and "(feat. …)" suffixes;
- full-width characters;
- a leading artist name ("Gingerbee at Thalia Hall" matches "At Thalia Hall");
- "Live at" wording in a subtitle or at the start ("A Night at the Symphony: Live at the Hollywood Bowl" matches "…: Hollywood Bowl", "Dua Lipa - Live from the Royal Albert Hall" matches "Live from the Royal Albert Hall");
- "(Original Soundtrack Album)", a trailing "Original Motion Picture Score", "(OST from …)" and "(DJ Mix)", and "Pt. 2" read as "2".

Artists named differently from the library still match the same title: a full name finds the library's shorter one ("Stella Katherine Cole" finds "Stella Cole", "Samia Finnerty" finds "Samia"), a family name written first finds the usual order ("Aoba Ichiko" finds "Ichiko Aoba"), a library name with a disambiguation suffix is found without it ("Ugly" finds "Ugly (UK)"), and a compilation credited to "Various" finds the one album in your library with that title. A release that combines two ("Towards The End / Where To Find Me", "Folklore I & II") counts when you have either part, and a title also finds a longer library title by the same artist that ends with it ("Louder, Please" finds "A Little Louder, Please").

When no title matches exactly, an album by the same artist whose title continues the page's title counts too, so "BRAT" finds "Brat and it's completely different but also still brat". A separate remix, instrumental, a cappella, live, demo or numbered album ("Mordechai Remixes", "YOU ASKED! (Instrumental Album)", "Led Zeppelin IV", "Shin Megami Tensei V") never stands in for the original.

An album matched by its Spotify or MusicBrainz ID also gets the artist and title match, so a Navidrome copy the index didn't group with it still counts.

### Not sure

Some albums can't be confirmed but are probably in Navidrome, so they're marked **?** rather than missing:

- the same title credited to someone else, when the title is distinctive (12 or more letters and digits) and only one Navidrome album has it. Spotify often credits a label, composer or band ("ATLUS Sound Team", "Gustav Mahler", "Bill Evans Trio") where your tags have "ATLUS GAME MUSIC", an orchestra or "Bill Evans";
- a Navidrome album by the same artist whose title the page's title only adds words to ("Vanities" for "Vanities (Extended)"), or that adds a remix, instrumental or numbered part ("Illmatic XX" for "Illmatic").

Album pages show the Navidrome badge as **?** for these, linking to the album it probably is.

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
