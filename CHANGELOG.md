# Changelog

All notable changes to `library-badges` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.9] - 2026-11-13

### Fixed
- **MusicBrainz:** On a release group page, the Plex badge no longer lands on a release you don't have (often the CD) because of the release Plex's own metadata matched; it now sits on the release your Navidrome or Jellyfin copy is tagged with, or the closest digital release.

## [0.1.8] - 2026-11-10

### Added
- **Spotify Desktop App:** Install and uninstall scripts for Windows (PowerShell) and macOS and Linux, like the Random Library and Release List apps; see the README.

### Fixed
- **Spotify Desktop App:** Libraries on servers that don't allow Spotify's origin, such as Jellyfin and Spicetify Library, no longer leave the library index stuck unbuilt (and the badges missing) when Spotify starts; the extension now waits for Spotify's request bridge before it runs.

## [0.1.7] - 2026-11-06

### Security
- **Navidrome:** Requests use Subsonic token authentication (a salted hash) instead of putting the password in the URL, so it no longer shows up in Navidrome or reverse proxy logs.
- **Settings:** Saved passwords, tokens and API keys are no longer filled back into the settings form, where scripts on the page could read them; leave a field blank to keep what's saved. The form is in a closed shadow root.

## [0.1.6] - 2026-11-06

### Added
- **Spotify:** The web player's album pages show the library badges under the play button row, and album cards in search, home, artist and album pages and Your Library are marked, matched by Spotify album ID, then artist and title. Your Library's list view, with its small covers, shows the icons in a two-by-two grid.
- **Deemix and Tidarr:** Your own Deemix and Tidarr show the library badges on album pages and mark albums in search results, artist pages and Deemix's charts and favorites, so you can see what you have before downloading it. Download links there leave out the downloader you're on.
- **Spicetify Library:** Its library, Discover and Release List tabs mark each album, matched by Spotify album ID.
- **Page Counter:** The list has a search box, a menu to show items in or not in one library (or watched and not watched), and A–Z sorting. **Copy list** replaces Copy missing and copies exactly what's shown.
- **Page Counter:** Clicking a name flashes an outline around the item after scrolling to it.
- **Not Sure:** Albums Navidrome probably has under another credit or title (the same distinctive title credited to someone else, or a title by the same artist with words added) get an amber **?** linking to that Navidrome album instead of counting as missing. The counter lists them under Not sure, and album pages show the Navidrome badge as **?**.
- **Spotify Desktop App:** The same file runs as a Spicetify extension, with the Spotify web player's badges on album pages, cards and Your Library inside Spotify's desktop app. Its commands are in a Library Badges submenu of the profile menu, settings import from the clipboard, and servers have to be reachable over https; see the README.
- **Spotify Desktop App:** The Random Library and Release List apps mark their album cards, matched by Spotify album ID (by artist and title with versions of the apps from before this).
- Deemix, Tidarr and Spicetify Library need their addresses added to the script's custom matches once; see the README.

### Changed
- **Page Counter:** An album counts as in your library only once it's in Navidrome, where downloads land, as the ↓ already did; albums only in Plex, Jellyfin or Spotify count as missing. Dimmed covers follow the same rule.

### Fixed
- **Bandcamp:** In your own collection, private albums get their icons too, and Bandcamp's download checkbox moves to the cover's bottom-left corner so the icons keep the top-left.
- **Album Matching:** An album matched by its Spotify or MusicBrainz ID also gets the artist and title match, so a Navidrome copy credited or titled differently still counts (Spotify pages, Your Library, RateYourMusic, MusicBrainz and album pages).
- **Album Matching:** Titles match across "(Original Soundtrack Album)", a trailing "Original Motion Picture Score", "(OST from …)", "(DJ Mix)", "Pt. 2" and "2", a bracket with no space before it, and a leading "Artist - Live from …". A title that continues with a number ("Shin Megami Tensei V") or an instrumental album no longer stands in for the original.
- **Album Pages:** Going from one album straight to another on Spotify (and other sites that switch pages without reloading) shows the new album's badges, instead of none or the previous album's until you navigate away or reload.
- **Spotify:** The album you have open is marked in Your Library too, so it has its badge as soon as the app starts on it.
- **Spotify:** Cards that show a status instead of the artist ("Album added") are still marked, by their Spotify album ID, and Your Library subtitles with a label in front ("Upcoming album", "New release") give their artist.

## [0.1.5] - 2026-11-05

### Fixed
- **Bandcamp:** Feed stories, the feed's New Releases sidebar and fan collections put their icons and ↓ on the album art instead of under the artist line.

## [0.1.4] - 2026-11-04

### Changed
- **Film Pages:** The Radarr pill shows even when a library has the film, with its Radarr state ("Downloaded (Bluray-1080p)") and a link to its Radarr page, like the Sonarr pill on show pages. SD and 720p copies still note the upgrade on it.
- **Album Pages:** Download pills (Deemix, Tidarr, slskd, Bandcamp) show even when Navidrome has the album, so every service is a click away.

## [0.1.3] - 2026-11-03

### Fixed
- **Album Matching:** An "EP" suffix no longer causes a mismatch: "Title - EP", "Title EP", "Title (EP)" and "Title [EP]" all match "Title".
- **Download Links:** The ▾ menu of other downloaders opens on RateYourMusic artist pages and other list views instead of being cut off by the row around it. It closes on an outside click, scroll or resize.

## [0.1.2] - 2026-11-01

### Changed
- **RateYourMusic:** The Issues list on album pages marks only digital and streaming issues, with each library's icon on the issue closest to its copy: the same title, then the same edition wording, then the primary issue. Physical issues stay unmarked.
- **MusicBrainz:** Release group pages mark only the release you have: the one a library's copy is tagged with, otherwise the closest digital release. Other releases stay unmarked.

### Fixed
- **Cover Marks:** RateYourMusic charts put their icons and ↓ on the album art instead of after the title. Marks after a title line up with the title's text on every site, even when the title is larger than the text around it.
- **Album Matching:** Numbered albums no longer stand in for each other ("Led Zeppelin" and "Led Zeppelin IV", "Volume 2" and "Volume 3", "Kraftwerk 2" and "Kraftwerk"). Titles made only of symbols stay distinct ("×" and "÷"). A title shared across services only groups albums that share an artist or are credited to "Various Artists", so Queen's and Bob Dylan's "Greatest Hits" stay apart. "(Live)" in a title now counts, so a live album no longer matches the studio album, and edition wording only matches whole words, so "(Alive)" stays in a title.
- **Film Index:** Files tagged with an 11-character name such as `[tmdbid-1234]` or `[720p-Bluray]` are no longer mistaken for YouTube videos and dropped from the film index.
- **Letterboxd:** A missing film whose title matches another film a year away now gets its ↓. Posters offer both Radarr and Sonarr, since they don't say whether an item is a film or a show.
- **Library Index:** A service that can't be reached no longer wipes its cached items: the last good index stays and is retried every 15 minutes. Changing a password, token, API key or the Jellyfin user rebuilds the index right away. Tabs share background index rebuilds instead of each scanning every library.
- **Reliability:** A failed page scan or a failed index load no longer leaves badges stuck on "…" or stops later rescans. An artist or film named "Constructor" no longer breaks the index or lookups.
- **MusicBrainz:** Search, label and similar tables match by each row's artist, not only by MusicBrainz ID.
- **YouTube:** Going back to a page such as the home page counts its videos again, and pages YouTube keeps hidden aren't scanned.
- **Counter:** The open list only redraws when its items change, so it keeps its scroll position and clicks register. Items Radarr or Sonarr has but doesn't monitor count as missing, not on the way.
- **Background Tabs:** Pages rescan when you switch to them, so anything that loaded while the tab was hidden gets marked.
- **Film Details:** A film with several versions shows the details of the best one, and "upgrade from 720p" no longer appears when you also have a better copy of it in that library.
- **Index Checks:** Plex's quick check only looks at the libraries the index covers, so a new film no longer rebuilds the music index and a music play no longer rebuilds the film index.
- **Tidarr:** The ↓ on RateYourMusic chart rows opens the album directly when the row links it on Tidal.
- **Import Settings:** Pasting JSON that isn't Library Badges settings shows the error instead of blanking every setting.

## [0.1.1] - 2026-10-31

### Fixed
- **YouTube Search:** A video's icon sits on its thumbnail's top-left corner instead of below the thumbnail, where it looked like it belonged to the next result. It stays there while the hover preview plays, and the preview no longer takes the video's place in the counter's list.

## [0.1.0] - 2026-10-28

### Added
- **Album Badges:** RateYourMusic, MusicBrainz, Bandcamp, Discogs and Album of the Year album pages, and the review dialogs of The Fork and The Drop, show whether the album is in Navidrome, Plex, Jellyfin and your Spotify library. On RateYourMusic the page's Spotify link finds the album among your saved Spotify albums, and every library grouped with it counts as a match; MusicBrainz pages match by MusicBrainz ID; otherwise artist and title decide.
- **Film Badges:** Letterboxd film pages show whether the film or show is in Plex or Jellyfin, matched by TMDB ID. Owned films show their quality, size, watched state and, for foreign-language films, the audio language and whether English subtitles are there. Owned shows show their season and episode counts.
- **YouTube Badges:** YouTube video pages show whether the video is in Plex or Jellyfin, matched by the video ID in the file name that yt-dlp writes. These videos are kept out of the film index.
- **Any Page:** Every page of a supported site that lists albums, films or videos (charts, artist and people pages, lists, collections, discover and search results, recommendations, feeds) shows the icon of each library that has the item, once per item, with a counter of how many items on the page you have, such as how complete a filmography or collection is. Items you don't have get a ↓ that opens your default downloader, with the others one click away, or the Radarr or Sonarr icon when that service already has the film or show. Watched films, shows and videos get a ✓, and shows missing episodes in Sonarr show how many you have. The counter adds how many are on the way; click it to list the items grouped as in your library, on the way and missing, filter to one group, copy the missing ones, and scroll to any of them. Letterboxd posters match by title and year, confirming a one-year difference against the film's TMDB ID.
- **Requests and Downloads:** Films missing from every library link to Radarr, with Radarr's state when an API key is set. Films you only have in 720p or SD link to Radarr to look for a better copy. Shows link to Sonarr with how many episodes you have and how many are missing. Albums missing from Navidrome link to Deemix and Tidarr (straight to the album when the page has a Deezer or Tidal link), to slskd's search page and, optionally, to a Bandcamp search. Nothing is requested, downloaded or bought automatically.
- **Search Fallbacks:** A library badge that finds nothing links to that library's search, in case the item is there under another name.
- **Letterboxd Logging:** With a Letterboxd username set, films you've watched in Plex or Jellyfin but haven't logged are noted.
- **Library Index:** Album, film, video and list pages share one index per kind of media, cached for six hours and rebuilt in the background when a quick check every 15 minutes finds something new.
- **Cross-Service Grouping:** The index groups each item's copies across services by MusicBrainz, TMDB, IMDb or TVDB ID, matching artist and title, or a title only one album has on each service, so an album shows every service even when Plex credits "Various Artists" or Spotify credits the composer.
- **Title Matching:** Edition wording such as "(Deluxe Edition)", "(2004 Remastered)", "45th Anniversary", ": Tenth Anniversary Edition" or "(B Sides)", soundtrack descriptors such as "(Original Game Soundtrack)", "(feat. …)" suffixes, full-width characters, a leading artist name ("Gingerbee at Thalia Hall" and "At Thalia Hall") and "Live at" wording in a subtitle are ignored when comparing titles. An album by the same artist whose title continues the release's title also counts ("BRAT" finds "Brat and it's completely different but also still brat"), unless the rest is only remixes, instrumentals or similar. Artists named differently still match the same title: a full name finds a shorter library name ("Stella Katherine Cole" and "Stella Cole", "Samia Finnerty" and "Samia"), a family name written first finds the usual order, a disambiguation suffix such as "(UK)" is ignored, and "Various" compilations match a title only one album has. A release that combines two counts when you have either part, and a title also finds a longer library title by the same artist that ends with it.
- **Player Links:** Badges and icons open the item in Navidrome (or Feishin), Plex, Jellyfin or on open.spotify.com, in a new tab.
- **Settings Dialog:** One dialog grouped by service, with a **Test** button per service that checks the connection before saving, a choice of which Jellyfin user's watched state is shown, a **Display** section to hide film details, list icons, the ↓ or the counter, choose the default album downloader and dim the covers of items you have, and a **Library gaps** view listing what each library is missing compared with the others. Pages show a **Set up Library Badges** badge until a service is configured.
- **Menu Commands:** **Refresh library index** rebuilds the index right away, and **Export settings** and **Import settings** copy every setting to another browser.
