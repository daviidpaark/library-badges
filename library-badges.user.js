// ==UserScript==
// @name         Library Badges
// @namespace    https://github.com/daviidpaark/library-badges
// @version      0.1.0
// @description  Shows whether albums on RateYourMusic, MusicBrainz, Bandcamp, Album of the Year, Discogs, The Fork and The Drop, films on Letterboxd and videos on YouTube are in your Navidrome, Plex, Jellyfin or Spotify library, with links to download or add what you are missing.
// @author       daviidpaark
// @match        https://rateyourmusic.com/*
// @match        https://letterboxd.com/*
// @match        https://bandcamp.com/*
// @match        https://*.bandcamp.com/*
// @match        https://www.discogs.com/*
// @match        https://www.albumoftheyear.org/*
// @match        https://musicbrainz.org/*
// @match        https://the-fork.vercel.app/*
// @match        https://the-drop-reviews.vercel.app/*
// @match        https://www.youtube.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      *
// @run-at       document-idle
// @noframes
// @updateURL    https://raw.githubusercontent.com/daviidpaark/library-badges/main/library-badges.user.js
// @downloadURL  https://raw.githubusercontent.com/daviidpaark/library-badges/main/library-badges.user.js
// ==/UserScript==

(function () {
  "use strict";

  const VERSION = "0.1.0";
  const INDEX_TTL = 6 * 60 * 60 * 1000;
  const INDEX_PAGE = 1000;
  const INDEX_VERSION = 13;
  const FRESHNESS_CHECK = 15 * 60 * 1000;

  // YouTube only accepts HTML strings through a Trusted Types policy.
  const htmlPolicy = (() => {
    try {
      return window.trustedTypes?.createPolicy("library-badges", { createHTML: (text) => text }) || null;
    } catch {
      return null;
    }
  })();

  function setHtml(element, text) {
    element.innerHTML = htmlPolicy ? htmlPolicy.createHTML(text) : text;
  }

  const SETTINGS_FORM = [
    {
      code: "n",
      name: "Navidrome",
      hint: "Your Navidrome login. Used for music.",
      fields: [
        ["navidromeUrl", "Server URL", "url", "https://navidrome.example.com"],
        ["navidromeUser", "Username", "text"],
        ["navidromePassword", "Password", "password"],
        ["navidromePlayer", "Open albums in", "select", [["navidrome", "Navidrome web"], ["feishin", "Feishin web"]]],
        ["feishinUrl", "Feishin URL", "url", "https://feishin.example.com"],
      ],
    },
    {
      code: "p",
      name: "Plex",
      hint: "The server's own address, not app.plex.tv. Used for music, films and YouTube videos.",
      fields: [
        ["plexUrl", "Server URL", "url", "https://plex.example.com:32400"],
        ["plexToken", "Token", "password"],
      ],
    },
    {
      code: "j",
      name: "Jellyfin",
      hint: "Create a key in Dashboard → API Keys. Used for music, films and YouTube videos.",
      fields: [
        ["jellyfinUrl", "Server URL", "url", "https://jellyfin.example.com"],
        ["jellyfinApiKey", "API key", "password"],
        ["jellyfinUser", "Watched state of (optional)", "text", "Username, or empty for the first administrator"],
      ],
    },
    {
      code: "s",
      name: "Spotify",
      hint: "The read-only address of Spicetify Library. Shows albums saved in Spotify.",
      fields: [["spicetifyLibraryUrl", "Spicetify Library URL", "url", "https://spotify.example.com"]],
    },
    {
      code: "r",
      name: "Radarr",
      hint: "Films you don't have link to Radarr's movie or add page. The API key adds whether it's monitored or downloading.",
      fields: [
        ["radarrUrl", "URL", "url", "http://radarr.example.com:7878"],
        ["radarrApiKey", "API key (optional)", "password"],
      ],
    },
    {
      code: "o",
      name: "Sonarr",
      hint: "Shows link to Sonarr's series or add page. The API key adds how many episodes you have and whether any are missing.",
      fields: [
        ["sonarrUrl", "URL", "url", "http://sonarr.example.com:8989"],
        ["sonarrApiKey", "API key (optional)", "password"],
      ],
    },
    {
      code: "d",
      name: "Deemix",
      hint: "Albums missing from Navidrome link to the album in Deemix, ready to download.",
      fields: [["deemixUrl", "URL", "url", "http://deemix.example.com:6595"]],
    },
    {
      code: "t",
      name: "Tidarr",
      hint: "Albums missing from Navidrome link to the album in Tidarr, ready to download.",
      fields: [["tidarrUrl", "URL", "url", "http://tidarr.example.com:8484"]],
    },
    {
      code: "k",
      name: "slskd",
      hint: "Albums missing from Navidrome link to slskd's search page.",
      fields: [["slskdUrl", "URL", "url", "http://slskd.example.com:5030"]],
    },
    {
      code: "c",
      name: "Bandcamp",
      hint: "Albums missing from Navidrome link to a Bandcamp search, where you can buy them.",
      fields: [["bandcampSearch", "Bandcamp search link", "select", [["off", "Off"], ["on", "On"]]]],
    },
    {
      code: "l",
      name: "Letterboxd",
      hint: "Your Letterboxd username. Film badges note films you've watched in Plex or Jellyfin but haven't logged.",
      fields: [["letterboxdUser", "Username", "text"]],
    },
    {
      code: "",
      name: "Display",
      hint: "What badges and list pages show. Missing items get a ↓ to download or add them, or the Radarr or Sonarr icon once they're there (with API keys set).",
      fields: [
        ["displayDetails", "Film details", "select", [["", "Show quality, size, languages and watched"], ["off", "Hide"]]],
        ["displayListIcons", "Icons on lists", "select", [["", "Show"], ["off", "Hide"]]],
        ["displayGet", "↓ on missing items", "select", [["", "Show"], ["off", "Hide"]]],
        ["musicDownloader", "Albums download with", "select", [["", "Deemix"], ["t", "Tidarr"], ["k", "slskd"], ["c", "Bandcamp"]]],
        ["displayCounter", "Page counter", "select", [["", "Show"], ["off", "Hide"]]],
        ["displayDim", "Covers you have", "select", [["", "Normal"], ["on", "Dimmed (hover to see)"]]],
      ],
    },
  ];
  const URL_KEYS = ["navidromeUrl", "feishinUrl", "plexUrl", "jellyfinUrl", "spicetifyLibraryUrl", "radarrUrl", "sonarrUrl", "deemixUrl", "tidarrUrl", "slskdUrl"];
  const SETTING_KEYS = SETTINGS_FORM.flatMap((group) => group.fields.map(([key]) => key));

  // Navidrome, Plex, Tidarr and slskd: selfh.st/icons (CC BY 4.0). Jellyfin, Spotify, Radarr, Sonarr, Letterboxd, Bandcamp and Deezer
  // (for Deemix): Simple Icons (CC0).
  const ICONS = {
    o: { color: "#2596BE", viewBox: "0 0 24 24", path: "M21.212 4.282c1.851 2.204 2.777 4.776 2.777 7.718 0 2.848-.867 5.344-2.602 7.489a934.355 934.355 0 0 1-2.101-2.095c-1.477-1.477-1.792-3.293-1.792-5.278 0-2.224.127-3.486 1.577-4.935l2.478-2.478a13.209 13.209 0 0 0-.337-.421Zm-17.7 16.193C1.708 18.678.6 16.59.188 14.213A11.84 11.84 0 0 1 .011 12c0-.28.006-.548.017-.802 0-.026.007-.052.022-.078.153-2.601 1.076-4.889 2.767-6.865-.108.127-.214.256-.316.387 0 0 1.351 1.346 2.329 2.323 1.408 1.409 1.726 3.215 1.726 5.151 0 1.985-.249 3.762-1.781 5.295-1.035 1.035-2.119 2.124-2.119 2.124.112.136.229.271.349.404.029-.027 1.297-1.348 2.123-2.175 1.638-1.637 1.928-3.528 1.928-5.648 0-2.072-.365-3.997-1.873-5.504a620.045 620.045 0 0 0-2.366-2.357c.168-.196.342-.388.523-.576l3.117 3.106-.194.195 1.903 1.898.547-.549L6.81 6.432l-.196.196L3.495 3.52c.01-.009.436-.416.643-.597.009.011 2.28 2.283 2.28 2.283 1.538 1.537 3.5 1.955 5.621 1.955 2.18 0 4.134-.442 5.731-2.038.907-.908 2.153-2.149 2.162-2.16.17.151.491.461.56.528l.013.013-3.111 3.028-.001.002-.197-.194-1.876 1.903.552.543 1.875-1.903-.197-.194 3.109-3.026c.193.203.377.41.553.619-.03.025-2.495 2.546-2.495 2.546-1.556 1.556-1.723 2.9-1.723 5.288 0 2.121.361 4.054 1.939 5.632a576.91 576.91 0 0 0 2.133 2.124c-.183.208-.599.645-.613.66l-3.066-3.174.195-.196-1.995-1.986-.546.549 1.995 1.986.195-.196 3.065 3.172c-.021.019-.385.362-.552.506-.01-.013-1.974-1.978-1.974-1.978-1.842-1.842-3.299-2.039-5.731-2.039-2.338 0-3.92.239-5.632 1.95-.944.944-2.078 2.085-2.089 2.099-.275-.23-.649-.594-.649-.594l3.019-3.024.199.192 1.854-1.925-.558-.538-1.854 1.926.199.191-3.016 3.022ZM12 8.672A3.33 3.33 0 0 0 8.672 12 3.33 3.33 0 0 0 12 15.328 3.33 3.33 0 0 0 15.328 12 3.33 3.33 0 0 0 12 8.672ZM4.52 2.6C6.665.867 9.162 0 12.011 0c2.88 0 5.394.88 7.541 2.639 0 0-1.215 1.209-2.136 2.13-1.496 1.496-3.334 1.892-5.377 1.892-1.985 0-3.829-.37-5.267-1.809L4.52 2.6Zm14.837 18.909a9.507 9.507 0 0 1-.342.256C16.994 23.255 14.659 24 12.011 24c-2.652 0-4.983-.745-6.993-2.235-.104-.074-.208-.15-.31-.227 0 0 1.096-1.101 2.053-2.058 1.602-1.602 3.09-1.804 5.278-1.804 2.28 0 3.651.166 5.377 1.892l1.941 1.941Z" },
    c: { color: "#629AA9", viewBox: "0 0 24 24", path: "M0 18.75l7.437-13.5H24l-7.438 13.5H0z" },
    l: { color: "#00E054", viewBox: "0 0 24 24", path: "M8.224 14.352a4.447 4.447 0 0 1-3.775 2.092C1.992 16.444 0 14.454 0 12s1.992-4.444 4.45-4.444c1.592 0 2.988.836 3.774 2.092-.427.682-.673 1.488-.673 2.352s.246 1.67.673 2.352zM15.101 12c0-.864.247-1.67.674-2.352-.786-1.256-2.183-2.092-3.775-2.092s-2.989.836-3.775 2.092c.427.682.674 1.488.674 2.352s-.247 1.67-.674 2.352c.786 1.256 2.183 2.092 3.775 2.092s2.989-.836 3.775-2.092A4.42 4.42 0 0 1 15.1 12zm4.45-4.444a4.447 4.447 0 0 0-3.775 2.092c.427.682.673 1.488.673 2.352s-.246 1.67-.673 2.352a4.447 4.447 0 0 0 3.775 2.092C22.008 16.444 24 14.454 24 12s-1.992-4.444-4.45-4.444z" },
    n: { color: "#0084ff", viewBox: "0 0 512 512", path: "M256 0C114.8 0 0 114.8 0 256s114.8 256 256 256 256-114.8 256-256S397.2 0 256 0m0 491.3C126.3 491.3 20.7 385.7 20.7 256S126.3 20.7 256 20.7 491.3 126.3 491.3 256 385.7 491.3 256 491.3m0-137.9c-53.7 0-97.4-43.7-97.4-97.4s43.7-97.4 97.4-97.4 97.4 43.7 97.4 97.4-43.7 97.4-97.4 97.4m0-174.8c-42.7 0-77.4 34.7-77.4 77.4s34.7 77.4 77.4 77.4 77.4-34.7 77.4-77.4-34.7-77.4-77.4-77.4m0 235c-5.5 0-10-4.5-10-10s4.5-10 10-10c75.9 0 137.6-61.7 137.6-137.6 0-5.5 4.5-10 10-10s10 4.5 10 10c0 86.9-70.7 157.6-157.6 157.6M108.4 266c-5.5 0-10-4.5-10-10 0-86.9 70.7-157.6 157.6-157.6 5.5 0 10 4.5 10 10s-4.5 10-10 10c-75.9 0-137.6 61.7-137.6 137.6 0 5.5-4.5 10-10 10M256 459.8c-5.5 0-10-4.5-10-10s4.5-10 10-10c85.4 0 160.9-60.3 179.5-143.4 1.2-5.4 6.6-8.8 11.9-7.6 5.4 1.2 8.8 6.6 7.6 11.9-10 44.5-35.1 84.8-70.7 113.7-36.1 29.3-81.7 45.4-128.3 45.4m193.6-186.4h-.8c-5.5-.5-9.6-5.3-9.1-10.8.2-2 .2-4.3.2-6.6 0-5.5 4.5-10 10-10s10 4.5 10 10c0 2.5 0 5.4-.2 8.2-.5 5.3-4.9 9.2-10.1 9.2M62.2 266c-5.5 0-10-4.5-10-10 0-2.4 0-4.9.2-7.5.5-5.5 5.4-9.5 10.9-9.1 5.5.5 9.6 5.4 9.1 10.9-.2 1.7-.2 3.7-.2 5.7 0 5.5-4.5 10-10 10m3.8-38.6c-.7 0-1.3-.1-2-.2-5.4-1.1-8.9-6.4-7.8-11.8C75.4 120.8 159.5 52.2 256 52.2c5.5 0 10 4.5 10 10s-4.5 10-10 10c-87.1 0-162.9 61.9-180.2 147.2-1 4.7-5.2 8-9.8 8M256 284c-15.4 0-28-12.6-28-28s12.6-28 28-28 28 12.6 28 28-12.6 28-28 28m0-36c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8" },
    p: { color: "#e5a00d", viewBox: "0 0 512 512", path: "M256 70H148l108 186-108 186h108l108-186z" },
    j: { color: "#00A4DC", viewBox: "0 0 24 24", path: "M12 .002C8.826.002-1.398 18.537.16 21.666c1.56 3.129 22.14 3.094 23.682 0C25.384 18.573 15.177 0 12 0zm7.76 18.949c-1.008 2.028-14.493 2.05-15.514 0C3.224 16.9 9.92 4.755 12.003 4.755c2.081 0 8.77 12.166 7.759 14.196zM12 9.198c-1.054 0-4.446 6.15-3.93 7.189.518 1.04 7.348 1.027 7.86 0 .511-1.027-2.874-7.19-3.93-7.19z" },
    s: { color: "#1ED760", viewBox: "0 0 24 24", path: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" },
    r: { color: "#FFCB3D", viewBox: "0 0 24 24", path: "M5.274 0C3.189.039 1.19 1.547 1.19 4.705l.184 14.518c0 1.47 1.103 2.205 2.573 2.021L3.764 3.786c0-1.654.919-1.838 2.022-1.103l14.7 8.27c1.103.734 1.655 1.47 1.838 2.756.92-1.654.552-4.043-1.286-5.33L7.991.846A4.559 4.559 0 0 0 5.274.001zm1.982 6.91-.184 10.107 9.004-5.146Zm13.598 6.064-15.068 8.82c-.92.552-2.022.736-3.124.368.918 1.47 3.307 2.389 5.145 1.47l12.68-7.35c1.102-.736 1.286-2.022.367-3.308z" },
    d: { color: "#A238FF", viewBox: "0 0 24 24", path: "M.693 10.024c.381 0 .693-1.256.693-2.807 0-1.55-.312-2.807-.693-2.807C.312 4.41 0 5.666 0 7.217s.312 2.808.693 2.808ZM21.038 1.56c-.364 0-.684.805-.91 2.096C19.765 1.446 19.184 0 18.526 0c-.78 0-1.464 2.036-1.784 5-.312-2.158-.788-3.536-1.325-3.536-.745 0-1.386 2.704-1.62 6.472-.442-1.932-1.083-3.145-1.793-3.145s-1.35 1.213-1.793 3.145c-.242-3.76-.874-6.463-1.628-6.463-.537 0-1.013 1.378-1.325 3.535C6.938 2.036 6.262 0 5.474 0c-.658 0-1.247 1.447-1.602 3.665-.217-1.291-.546-2.105-.91-2.105-.675 0-1.221 2.807-1.221 6.272 0 3.466.546 6.273 1.221 6.273.277 0 .537-.476.736-1.273.32 2.928.996 4.938 1.776 4.938.606 0 1.143-1.204 1.507-3.11.251 3.622.875 6.195 1.602 6.195.46 0 .875-1.023 1.187-2.677C10.142 21.6 11 24 12.004 24c1.005 0 1.863-2.4 2.235-5.822.312 1.654.727 2.677 1.186 2.677.728 0 1.352-2.573 1.603-6.195.364 1.906.9 3.11 1.507 3.11.78 0 1.455-2.01 1.775-4.938.208.797.46 1.273.737 1.273.675 0 1.22-2.807 1.22-6.273-.008-3.457-.553-6.272-1.23-6.272ZM23.307 10.024c.381 0 .693-1.256.693-2.807 0-1.55-.312-2.807-.693-2.807-.381 0-.693 1.256-.693 2.807s.312 2.808.693 2.808Z" },
    t: { color: "#90d8ff", viewBox: "0 0 512 512", path: "M245.3.1c-.2.1-4.2.4-9 .8-4.8.3-10.5.8-12.7 1.1-4 .5-24.4 4.2-27.7 5.1-36 9-67.8 24.4-97 47C89 61.7 85.5 64.9 73 77.5c-36.2 36.4-60.6 84.4-69.4 135.9C1.1 228.7.2 239.3.2 256.3c0 19.8 1 30.3 4.4 47.9C18.2 375.8 61.6 438 124 475.7c28.5 17.1 64.2 29.9 94.8 34 2.5.4 5.4.8 6.6 1 9.5 1.5 36.4 2 51.7 1 5-.4 9.4-.8 9.7-1s2.9-.5 5.8-.9c2.9-.3 10-1.6 15.8-2.7 14.1-3 12.8-2.6 22.8-5.8 74.6-23.4 134.3-78.5 162.9-150.4 8-20.1 12.6-37.9 16.2-62 2.3-15.5 2.3-47.2.1-64.1-6.5-49-24.2-90.4-55.2-129.5-8.5-10.7-26.4-28.7-36.5-36.8-4.1-3.2-8.3-6.6-9.2-7.4-4.6-3.8-23-15.5-32-20.3C346.9 14.3 314.4 4.4 278.9 1c-5.7-.6-33.2-1.3-33.6-.9m33.8 143.1c23.2 5.1 41.6 15.2 58.2 31.6 16.4 16.3 26.7 35.2 31.7 58.6 2.3 10.5 2.2 36.1-.1 46-3.6 15.8-9.4 29.2-18.2 42.3-7.6 11.2-24.4 27-35.5 33.3-12.6 7.1-23.5 11.3-35.7 13.9-23.4 4.7-47.5 2.5-68.4-6.7-14.8-6.5-25.2-13.5-36.4-24.8-19.1-19.1-29.7-40.8-33.3-68.2-.6-4.1-.7-20.5-.2-25 2.1-19.1 9-37.8 20-53.8 4.1-6.1 17.9-20.8 23.4-25.1 14.8-11.5 36.4-20.8 52.7-22.9 2.2-.3 4.1-.6 4.3-.9 1.2-1 31.2.3 37.5 1.7m-30.3 88.4c-6.7 2-12.3 6.9-16.2 14.1-2.5 4.7-2.4 16.7.4 22 8.3 15.5 29 18.8 41 6.4 15.9-16.4 4.2-43.6-18.6-43.2-2.3-.1-5.3.2-6.6.7" },
    k: { color: "#cbd5e1", viewBox: "0 0 512 512", path: "M484.8 60.8C459.2 45.2 424.8 37 385 37c-60.9 0-128 19.2-188.3 52.7l-.4-.2s-.1.3-.1.5c-18.3 10.1-35.9 21.4-52.6 34.1C45.8 198.5 18.4 286.9 41.5 334.2 16.2 377.3.6 422 0 475c48.6-92.7 77.8-167.8 236.3-294.2-45.2 9.7-123.5 55.7-176.2 125.6-5-40.9 27.3-106.8 99.3-161.5 9.1-6.9 18.6-13.4 28.2-19.5-7.5 23.5-5.1 17.7-20.8 50.6 23.2-21.9 38.5-35.4 61.3-73 29.7-14.6 60.6-25.5 91.2-32.1-5.1 16.8-14.7 45.2-27.8 67.8 0 0 33.1-7.1 60.5-5.5-14.9 16.5-28.4 34.4-42.1 52.7-18.7 25-38 50.9-62.8 74.9-3 2.9-5.9 5.5-8.7 8.3-38-3.7-63.2 10.6-86.7 35.7 18.6-8.7 43.5-15.8 59.1-11.5-28.8 23.3-74.1 54.2-111.4 51.7-7.1 10.8-7.5 11.1-15.3 24.1 60.5 15 136.5-46.4 181.1-89.9 26.2-25.5 46.2-52.1 65.5-77.9 39.7-53.2 74.1-99.1 150.3-116.5l31-7.1z" },
  };

  function isAlbum(v) {
    return !v.type || v.type === "album";
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  function normalizeSettings(raw) {
    const settings = {};
    for (const key of SETTING_KEYS) settings[key] = String(raw[key] ?? "").trim();
    for (const key of URL_KEYS) {
      settings[key] = settings[key].replace(/\/+$/, "");
    }
    return settings;
  }

  function getSettings() {
    return normalizeSettings(Object.fromEntries(SETTING_KEYS.map((key) => [key, GM_getValue(key, "")])));
  }

  const SETTINGS_STYLE = `
    :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.6); color-scheme: dark; }
    :host > * { font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #e5e7eb; letter-spacing: normal; text-align: left; }
    * { box-sizing: border-box; }
    form { width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); display: flex; flex-direction: column;
      background: #151821; border: 1px solid #262b36; border-radius: 12px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
    header, footer { padding: 16px 20px; display: flex; align-items: center; gap: 10px; }
    header { border-bottom: 1px solid #262b36; }
    header h2 { margin: 0; font-size: 17px; color: #fff; flex: 1; }
    header p { margin: 0; color: #9ca3af; font-size: 12px; }
    .body { overflow-y: auto; padding: 8px 20px; }
    section { padding: 14px 0; border-bottom: 1px solid #262b36; }
    section:last-child { border-bottom: none; }
    .title { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
    .title svg { width: 18px; height: 18px; flex: none; }
    .title h3 { margin: 0; font-size: 15px; color: #fff; flex: 1; }
    .hint { margin: 0 0 10px 26px; color: #9ca3af; font-size: 12px; }
    .title h3:first-child { margin-left: 26px; }
    label { display: grid; grid-template-columns: 130px 1fr; align-items: center; gap: 10px; margin: 6px 0 0 26px; color: #d1d5db; font-size: 13px; }
    label[hidden] { display: none; }
    input, select { width: 100%; padding: 7px 9px; border-radius: 6px; border: 1px solid #2f3542; background: #0c0d12; color: #fff; font: inherit; font-size: 13px; }
    input:focus, select:focus { outline: none; border-color: #10b981; }
    button { padding: 7px 14px; border-radius: 6px; border: 1px solid #2f3542; background: #1f2430; color: #e5e7eb; font: inherit; font-size: 13px; cursor: pointer; }
    button:hover { background: #283040; }
    button.primary { background: #10b981; border-color: #10b981; color: #0c0d12; font-weight: 600; }
    button.primary:hover { background: #34d399; }
    button.test { padding: 4px 10px; font-size: 12px; }
    .status { font-size: 12px; color: #9ca3af; }
    .status.ok { color: #10b981; }
    .status.fail { color: #f87171; }
    footer { border-top: 1px solid #262b36; justify-content: flex-end; }
    footer .note { flex: 1; color: #9ca3af; font-size: 12px; }
    details { margin: 6px 0; }
    summary { cursor: pointer; color: #fff; font-size: 13px; padding: 4px 0; }
    details ul { margin: 6px 0 10px 18px; padding: 0; max-height: 240px; overflow-y: auto; color: #d1d5db; font-size: 12px; }
    .gaps-intro { color: #9ca3af; font-size: 12px; margin: 10px 0; }
  `;

  function openSettings() {
    if (document.getElementById("library-badges-settings")) return;
    const host = document.createElement("div");
    host.id = "library-badges-settings";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = SETTINGS_STYLE;
    const form = document.createElement("form");
    setHtml(form, `
      <header><div style="flex:1"><h2>Library Badges</h2><p>Fill in the services you use. Leave a service empty to turn it off.</p></div></header>
      <div class="body"></div>
      <footer><button type="button" class="gaps">Library gaps</button><span class="note">Saved in your userscript manager only.</span><button type="button" class="cancel">Cancel</button><button type="submit" class="primary">Save</button></footer>
    `);
    const body = form.querySelector(".body");
    const inputs = {};
    const saved = getSettings();

    for (const group of SETTINGS_FORM) {
      const section = document.createElement("section");
      const title = document.createElement("div");
      title.className = "title";
      const heading = document.createElement("h3");
      heading.textContent = group.name;
      const status = document.createElement("span");
      status.className = "status";
      const test = document.createElement("button");
      test.type = "button";
      test.className = "test";
      test.textContent = "Test";
      const server = SERVERS[group.code];
      title.append(...(group.code ? [iconSvg(group.code)] : []), heading, ...(server ? [status, test] : []));
      const hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = group.hint;
      section.append(title, hint);

      for (const [key, text, type, extra] of group.fields) {
        const label = document.createElement("label");
        const caption = document.createElement("span");
        caption.textContent = text;
        let input;
        if (type === "select") {
          input = document.createElement("select");
          for (const [value, optionText] of extra) input.append(new Option(optionText, value));
          input.value = extra.some(([value]) => value === saved[key].toLowerCase()) ? saved[key].toLowerCase() : extra[0][0];
        } else {
          input = document.createElement("input");
          input.type = type;
          input.value = saved[key];
          input.placeholder = extra || "";
          input.autocomplete = "off";
          input.spellcheck = false;
        }
        inputs[key] = input;
        label.append(caption, input);
        label.dataset.key = key;
        section.append(label);
      }

      test.addEventListener("click", async () => {
        const s = normalizeSettings(Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value])));
        status.className = "status";
        if (!server.configured(s)) {
          status.textContent = "Fill in the required fields first";
          return;
        }
        status.textContent = "Testing…";
        try {
          status.textContent = `✓ ${await server.test(s)}`;
          status.className = "status ok";
        } catch (error) {
          status.textContent = `✕ ${error.message}`;
          status.className = "status fail";
        }
      });
      body.append(section);
    }

    const feishinRow = body.querySelector('label[data-key="feishinUrl"]');
    const syncFeishin = () => (feishinRow.hidden = inputs.navidromePlayer.value !== "feishin");
    inputs.navidromePlayer.addEventListener("change", syncFeishin);
    syncFeishin();

    const close = () => host.remove();
    form.querySelector(".cancel").addEventListener("click", close);
    const sections = [...body.children];
    const gapsButton = form.querySelector(".gaps");
    gapsButton.addEventListener("click", () => {
      const showing = gapsButton.textContent === "Settings";
      body.replaceChildren(...(showing ? sections : [libraryGaps()]));
      gapsButton.textContent = showing ? "Library gaps" : "Settings";
    });
    host.addEventListener("click", (event) => {
      if (event.composedPath()[0] === host) close();
    });
    for (const type of ["keydown", "keyup", "keypress"]) {
      host.addEventListener(type, (event) => {
        event.stopPropagation();
        if (type === "keydown" && event.key === "Escape") close();
      });
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = normalizeSettings(Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value])));
      for (const key of SETTING_KEYS) GM_setValue(key, values[key]);
      location.reload();
    });

    shadow.append(style, form);
    document.documentElement.append(host);
    (Object.values(inputs).find((input) => !input.value) || inputs.navidromeUrl).focus();
  }

  // Lists what each library is missing compared with the others, from the cached indexes.
  function libraryGaps() {
    const view = document.createElement("div");
    const intro = document.createElement("p");
    intro.className = "gaps-intro";
    intro.textContent = "Items that are in at least one of your other libraries but not in this one, from the cached library index.";
    view.append(intro);
    const s = getSettings();
    for (const [kind, noun, one, site] of [["music", "albums", "album", "RateYourMusic"], ["films", "films and shows", "film or show", "Letterboxd"], ["videos", "YouTube videos", "YouTube video", "YouTube"]]) {
      if (INDEX_SOURCES[kind].filter(([, server]) => server.configured(s)).length < 2) continue;
      const index = GM_getValue(`index:${kind}`, null);
      if (!index?.groups) {
        const empty = document.createElement("p");
        empty.className = "gaps-intro";
        empty.textContent = `No ${noun} index yet. Open a ${site} page to build it.`;
        view.append(empty);
        continue;
      }
      const codes = INDEX_SOURCES[kind].map(([code]) => code).filter((code) => index.groups.some((group) => group[code]));
      for (const code of codes) {
        const missing = index.groups.filter((group) => !group[code] && codes.some((other) => other !== code && group[other])).map((group) => group._);
        missing.sort((a, b) => a.localeCompare(b));
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = `${SERVER_NAMES[code]} is missing ${missing.length} ${missing.length === 1 ? one : noun}`;
        const list = document.createElement("ul");
        for (const label of missing) {
          const item = document.createElement("li");
          item.textContent = label;
          list.append(item);
        }
        details.append(summary, list);
        view.append(details);
      }
    }
    return view;
  }

  function iconSvg(code) {
    const icon = ICONS[code];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", icon.viewBox);
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", icon.path);
    path.setAttribute("fill", icon.color);
    svg.append(path);
    return svg;
  }

  // ---------------------------------------------------------------------------
  // HTTP
  // ---------------------------------------------------------------------------
  // Resolves the response text, or null for a 404.
  function requestText(url, headers = {}) {
    const host = new URL(url).host;
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        headers,
        timeout: 20000,
        onload: (res) => {
          if (res.status === 404) return resolve(null);
          if (res.status < 200 || res.status >= 300) return reject(Object.assign(new Error(`${host} answered HTTP ${res.status}`), { status: res.status }));
          resolve(res.responseText);
        },
        onerror: () => reject(new Error(`Could not reach ${host}`)),
        ontimeout: () => reject(new Error(`${host} timed out`)),
      });
    });
  }

  async function request(url, headers = {}) {
    const text = await requestText(url, { Accept: "application/json", ...headers });
    if (text === null) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`${new URL(url).host} returned invalid JSON`);
    }
  }

  // For services that are only linked to: checks that the page answers at all.
  function reach(url) {
    const host = new URL(url).host;
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        timeout: 10000,
        onload: (res) => (res.status < 500 ? resolve(`Reachable (HTTP ${res.status})`) : reject(new Error(`${host} answered HTTP ${res.status}`))),
        onerror: () => reject(new Error(`Could not reach ${host}`)),
        ontimeout: () => reject(new Error(`${host} timed out`)),
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Matching
  // ---------------------------------------------------------------------------
  // NFKD also folds full-width characters ("０", "［ ］") into their plain forms.
  // keepLive keeps "Live at" wording, so a live album still reads as one when titles are compared by how they begin.
  function normalizeTitle(title, keepLive = false) {
    return String(title || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/['"’“”`]/g, "")
      .replace(/\s*[([{][^)\]}]*(deluxe|expanded|anniversary|remaster|special|bonus|clean|explicit|edition|re-?issue|reissue|mono|stereo|version|cut|box set|collector|live|\bb[\s-]?sides?\b|\bfeat\b|\bft\b|\bwith\b)[^)\]}]*[)\]}]/gi, "")
      .replace(/\s*[([{]\s*(?:the\s+)?(?:original\s+|official\s+)?(?:(?:video\s+)?game\s+|motion\s+picture\s+|television\s+|tv\s+|series\s+)?(?:soundtrack|score|ost)\s*[)\]}]/gi, "")
      .replace(/\s*[([{]\s*(?:original\s+)?music\s+(?:from|for)\s+(?:and\s+inspired\s+by\s+)?(?:the\s+)?(?:original\s+)?(?:motion\s+picture|film|series|game)\b[^)\]}]*[)\]}]/gi, "")
      .replace(/(\S)\s+(?:original\s+)?(?:(?:video\s+)?game\s+|motion\s+picture\s+)?soundtrack\s*$/i, "$1")
      .replace(/\s*[-:–—]\s*[^-:–—]*(deluxe|expanded|anniversary|remaster|edition|re-?issue|reissue|\bb[\s-]?sides?\b)[^-:–—]*$/gi, "")
      .replace(/\s*[([{]\d{4}[)\]}]/g, "")
      .replace(/([-:–—]\s*)(?:recorded\s+)?live\s+(?:at|from|in)\s+(?:the\s+)?/gi, (wording, separator) => (keepLive ? wording : separator))
      .replace(/\s*\+\s*/g, " and ")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+(?:\d+(?:st|nd|rd|th)\s+anniversary|(?:super\s+)?deluxe|expanded|(?:\d{4}\s+)?remastered)(?:\s+(?:edition|version))?\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Title keys for matching, with and without a leading artist name.
  function titleKeys(artist, title) {
    const key = matchKey(normalizeTitle(title));
    const prefix = matchKey(artist);
    return prefix && key.length > prefix.length && key.startsWith(prefix) ? [key, key.slice(prefix.length)] : [key];
  }

  // ---------------------------------------------------------------------------
  // Library servers
  // ---------------------------------------------------------------------------
  const navidrome = {
    configured: (s) => s.navidromeUrl && s.navidromeUser && s.navidromePassword,
    async call(s, method, params) {
      const password = [...new TextEncoder().encode(s.navidromePassword)].map((b) => b.toString(16).padStart(2, "0")).join("");
      const query = new URLSearchParams({ u: s.navidromeUser, v: "1.16.1", c: "library-badges", f: "json", ...params });
      const data = await request(`${s.navidromeUrl}/rest/${method}?${query}&p=enc:${password}`);
      const body = data?.["subsonic-response"];
      if (!body || body.status !== "ok") throw new Error(body?.error?.message || `Navidrome ${method} failed`);
      return body;
    },
    async test(s) {
      const body = await this.call(s, "ping", {});
      return `Connected${body.serverVersion ? ` to Navidrome ${body.serverVersion}` : ""}`;
    },
    async indexAlbums(s) {
      const albums = [];
      for (let offset = 0; ; offset += 500) {
        const body = await this.call(s, "getAlbumList2", { type: "alphabeticalByName", size: "500", offset: String(offset) });
        const page = body.albumList2?.album || [];
        for (const a of page) albums.push({ id: a.id, title: a.name, artist: a.artist, artists: (a.artists || []).map((x) => x.name), releaseId: a.musicBrainzId });
        if (page.length < 500) return albums;
      }
    },
    link(s, item) {
      return s.navidromePlayer.toLowerCase() === "feishin" && s.feishinUrl
        ? `${s.feishinUrl}/#/library/albums/${item.id}`
        : `${s.navidromeUrl}/app/#/album/${item.id}/show`;
    },
  };

  const plex = {
    configured: (s) => s.plexUrl && s.plexToken,
    get(s, path) {
      return request(`${s.plexUrl}${path}`, { "X-Plex-Token": s.plexToken });
    },
    async sections(s, type) {
      const data = await this.get(s, "/library/sections");
      return (data?.MediaContainer?.Directory || []).filter((d) => d.type === type).map((d) => d.key);
    },
    async test(s) {
      const data = await this.get(s, "/library/sections");
      const sections = data?.MediaContainer?.Directory;
      if (!sections) throw new Error("No Plex server at this address");
      return `Connected, ${sections.length} libraries`;
    },
    // Resolution, dynamic range, size, languages and watched state of one film, or the season and episode counts of a show.
    async details(s, id) {
      const m = (await this.get(s, `/library/metadata/${id}`))?.MediaContainer?.Metadata?.[0];
      if (!m) return null;
      if (m.type === "show") return { seasons: m.childCount, episodes: m.leafCount, watched: m.leafCount > 0 && m.viewedLeafCount === m.leafCount };
      const media = m.Media?.[0];
      const streams = media?.Part?.[0]?.Stream || [];
      const video = streams.find((stream) => stream.streamType === 1);
      const range = video?.DOVIPresent ? "Dolby Vision" : /smpte2084|arib-std-b67/.test(video?.colorTrc || "") ? "HDR" : "";
      return {
        quality: [RESOLUTIONS[media?.videoResolution] || media?.videoResolution, range].filter(Boolean).join(" "),
        resolution: resolutionOf(video?.width, video?.height),
        size: (media?.Part || []).reduce((sum, part) => sum + (part.size || 0), 0),
        watched: m.viewCount > 0,
        audio: streams.find((stream) => stream.streamType === 2)?.languageCode || "",
        subtitles: streams.filter((stream) => stream.streamType === 3).map((stream) => stream.languageCode || ""),
      };
    },
    async machine(s) {
      const cacheKey = `plexMachine:${s.plexUrl}`;
      let machine = GM_getValue(cacheKey, "");
      if (!machine) {
        const data = await this.get(s, "/identity");
        machine = data?.MediaContainer?.machineIdentifier || "";
        if (machine) GM_setValue(cacheKey, machine);
      }
      return machine;
    },
    async link(s, item) {
      return plexHref(await this.machine(s), item.id);
    },
    async pages(s, path) {
      const items = [];
      for (let start = 0; ; start += INDEX_PAGE) {
        const data = await this.get(s, `${path}${path.includes("?") ? "&" : "?"}X-Plex-Container-Start=${start}&X-Plex-Container-Size=${INDEX_PAGE}`);
        const page = data?.MediaContainer?.Metadata || [];
        items.push(...page);
        if (page.length < INDEX_PAGE) return items;
      }
    },
    async indexAlbums(s) {
      const albums = [];
      for (const key of await this.sections(s, "artist")) {
        for (const m of await this.pages(s, `/library/sections/${key}/all?type=9&includeGuids=1`)) {
          const mbid = (m.Guid || []).map((g) => g.id).find((id) => id.startsWith("mbid://"));
          albums.push({ id: m.ratingKey, title: m.title, artist: m.parentTitle, releaseId: mbid ? mbid.slice(7) : null });
        }
      }
      return albums;
    },
    async indexFilms(s) {
      const films = [];
      for (const [type, sectionType] of [["movie", "movie"], ["tv", "show"]]) {
        for (const key of await this.sections(s, sectionType)) {
          for (const m of await this.pages(s, `/library/sections/${key}/all?includeGuids=1`)) {
            if (youtubeIdOf(m.Media?.[0]?.Part?.[0]?.file)) continue;
            const guid = (prefix) => (m.Guid || []).map((g) => g.id).find((id) => id.startsWith(prefix))?.slice(prefix.length);
            const watched = type === "movie" ? m.viewCount > 0 : m.leafCount > 0 && m.viewedLeafCount >= m.leafCount;
            films.push({ id: m.ratingKey, titles: [m.title, m.originalTitle], year: m.year, type, tmdb: guid("tmdb://"), imdb: guid("imdb://"), tvdb: guid("tvdb://"), watched });
          }
        }
      }
      return films;
    },
    async indexVideos(s) {
      const videos = [];
      for (const key of await this.sections(s, "movie")) {
        for (const m of await this.pages(s, `/library/sections/${key}/all`)) {
          const video = youtubeIdOf(m.Media?.[0]?.Part?.[0]?.file);
          if (video) videos.push({ id: m.ratingKey, titles: [m.title], video, watched: m.viewCount > 0 });
        }
      }
      return videos;
    },
  };

  const RESOLUTIONS = { "4k": "4K", 1080: "1080p", 720: "720p", 576: "576p", 480: "480p", sd: "SD" };

  // Widescreen films are short and 4:3 films are narrow, so either dimension can decide.
  function resolutionOf(width, height) {
    if (!width && !height) return "";
    if (width >= 3200 || height >= 2000) return "4K";
    if (width >= 1700 || height >= 1000) return "1080p";
    return width >= 1200 || height >= 700 ? "720p" : "SD";
  }

  // yt-dlp puts the video ID in brackets at the start or end of the file name: "[dQw4w9WgXcQ] Title.mkv" or "Title [dQw4w9WgXcQ].mkv".
  function youtubeIdOf(path) {
    const name = String(path || "").split(/[\\/]/).pop();
    const match = name.match(/^\[([\w-]{11})\]|\[([\w-]{11})\]\.\w+$/);
    const id = match?.[1] || match?.[2];
    return id && !/^(?:WEB|Blu|HDTV|DVD|Remux|SDTV|Raw)/i.test(id) ? id : null;
  }

  function plexHref(machine, id) {
    return machine ? `https://app.plex.tv/desktop/#!/server/${machine}/details?key=${encodeURIComponent(`/library/metadata/${id}`)}` : null;
  }

  const jellyfin = {
    configured: (s) => s.jellyfinUrl && s.jellyfinApiKey,
    async items(s, params) {
      const query = new URLSearchParams({ Recursive: "true", CollapseBoxSetItems: "false", Fields: "ProviderIds", ...params });
      const data = await request(`${s.jellyfinUrl}/Items?${query}`, { Authorization: `MediaBrowser Token="${s.jellyfinApiKey}"` });
      return data?.Items || [];
    },
    async test(s) {
      const info = await request(`${s.jellyfinUrl}/System/Info`, { Authorization: `MediaBrowser Token="${s.jellyfinApiKey}"` });
      if (!info?.Version) throw new Error("No Jellyfin server at this address");
      if (s.jellyfinUser) await this.userId(s);
      return `Connected to ${info.ServerName || "Jellyfin"} ${info.Version}`;
    },
    // Watched state is per user, and an API key isn't tied to one, so the chosen user (or the first administrator) is used.
    async userId(s) {
      const cacheKey = `jellyfinUser:${s.jellyfinUrl}:${s.jellyfinUser}`;
      let id = GM_getValue(cacheKey, "");
      if (!id) {
        const users = (await request(`${s.jellyfinUrl}/Users`, { Authorization: `MediaBrowser Token="${s.jellyfinApiKey}"` })) || [];
        const user = s.jellyfinUser
          ? users.find((u) => u.Name.toLowerCase() === s.jellyfinUser.toLowerCase())
          : users.find((u) => u.Policy?.IsAdministrator) || users[0];
        if (s.jellyfinUser && !user) throw new Error(`No Jellyfin user named ${s.jellyfinUser}`);
        id = user?.Id || "";
        if (id) GM_setValue(cacheKey, id);
      }
      return id;
    },
    async details(s, id) {
      const userId = await this.userId(s).catch(() => "");
      const item = (await this.items(s, { Ids: id, Fields: "MediaSources,ChildCount,RecursiveItemCount", ...(userId ? { userId } : {}) }))[0];
      if (!item) return null;
      if (item.Type === "Series") {
        const episodes = await this.items(s, { ParentId: id, IncludeItemTypes: "Episode", Fields: "", EnableImages: "false", ...(userId ? { userId } : {}) });
        return { seasons: item.ChildCount, episodes: episodes.length, watched: !!item.UserData?.Played };
      }
      const source = item.MediaSources?.[0];
      const streams = source?.MediaStreams || [];
      const video = streams.find((stream) => stream.Type === "Video");
      const rangeType = String(video?.VideoRangeType || "");
      const range = rangeType.startsWith("DOVI") ? "Dolby Vision" : /HDR|HLG/.test(rangeType) ? "HDR" : "";
      return {
        quality: [resolutionOf(video?.Width, video?.Height), range].filter(Boolean).join(" "),
        resolution: resolutionOf(video?.Width, video?.Height),
        size: source?.Size || 0,
        watched: !!item.UserData?.Played,
        audio: streams.find((stream) => stream.Type === "Audio")?.Language || "",
        subtitles: streams.filter((stream) => stream.Type === "Subtitle").map((stream) => stream.Language || ""),
      };
    },
    async pages(s, params) {
      const items = [];
      for (let start = 0; ; start += INDEX_PAGE) {
        const page = await this.items(s, { EnableImages: "false", EnableUserData: "false", StartIndex: String(start), Limit: String(INDEX_PAGE), ...params });
        items.push(...page);
        if (page.length < INDEX_PAGE) return items;
      }
    },
    async indexAlbums(s) {
      const items = await this.pages(s, { IncludeItemTypes: "MusicAlbum" });
      return items.map((i) => ({
        id: i.Id,
        title: i.Name,
        artist: i.AlbumArtist,
        artists: (i.AlbumArtists || []).map((a) => a.Name),
        releaseId: i.ProviderIds?.MusicBrainzAlbum || null,
        groupId: i.ProviderIds?.MusicBrainzReleaseGroup || null,
      }));
    },
    async userData(s) {
      const userId = await this.userId(s).catch(() => "");
      return userId ? { userId, EnableUserData: "true" } : {};
    },
    // Watched items come from one filtered query alongside the index pages; asking every page for user data is slower.
    async playedIds(s) {
      const { userId } = await this.userData(s);
      if (!userId) return new Set();
      const items = await this.items(s, { IncludeItemTypes: "Movie,Series", Filters: "IsPlayed", Fields: "", EnableImages: "false", EnableUserData: "false", userId });
      return new Set(items.map((i) => i.Id));
    },
    async indexFilms(s) {
      const [items, played] = await Promise.all([
        this.pages(s, { IncludeItemTypes: "Movie,Series", Fields: "OriginalTitle,ProviderIds,Path" }),
        this.playedIds(s).catch(() => new Set()),
      ]);
      return items.filter((i) => !this.youtubeId(i)).map((i) => ({
        id: i.Id,
        titles: [i.Name, i.OriginalTitle],
        year: i.ProductionYear,
        type: i.Type === "Series" ? "tv" : "movie",
        tmdb: i.ProviderIds?.Tmdb,
        imdb: i.ProviderIds?.Imdb,
        tvdb: i.ProviderIds?.Tvdb,
        watched: played.has(i.Id),
      }));
    },
    youtubeId(item) {
      const id = item.ProviderIds?.YoutubeMetadata;
      return /^[\w-]{11}$/.test(id || "") ? id : youtubeIdOf(item.Path);
    },
    async indexVideos(s) {
      const [items, played] = await Promise.all([this.pages(s, { IncludeItemTypes: "Movie", Fields: "ProviderIds,Path" }), this.playedIds(s).catch(() => new Set())]);
      return items.map((i) => ({ id: i.Id, titles: [i.Name], video: this.youtubeId(i), watched: played.has(i.Id) })).filter((v) => v.video);
    },
    link(s, item) {
      return `${s.jellyfinUrl}/web/#/details?id=${item.id}`;
    },
  };

  const spotify = {
    configured: (s) => s.spicetifyLibraryUrl,
    async test(s) {
      const meta = await request(`${s.spicetifyLibraryUrl}/api/meta`);
      if (!meta?.library) throw new Error("No Spicetify Library at this address");
      return `Connected, ${meta.library.albums} saved albums`;
    },
    async indexAlbums(s) {
      const albums = [];
      for (let offset = 0; ; offset += 200) {
        const data = await request(`${s.spicetifyLibraryUrl}/api/albums?limit=200&offset=${offset}&sort=name-asc`);
        const page = data?.items || [];
        for (const a of page) {
          const ids = [a.uri, ...(a.editions || []).map((e) => e.uri)].map((uri) => uri.replace("spotify:album:", ""));
          albums.push({ id: ids[0], title: a.name, artist: a.artist, spotifyIds: ids });
        }
        if (page.length < 200) return albums;
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Request and download services (only linked to; nothing is requested or downloaded automatically)
  // ---------------------------------------------------------------------------
  const radarr = {
    configured: (s) => s.radarrUrl,
    get(s, path) {
      return request(`${s.radarrUrl}/api/v3${path}`, { "X-Api-Key": s.radarrApiKey });
    },
    async test(s) {
      if (!s.radarrApiKey) return reach(s.radarrUrl);
      const status = await this.get(s, "/system/status");
      return `Connected to Radarr ${status?.version || ""}`.trim();
    },
    // Returns the movie (or null) and a short state such as "Downloaded (Bluray-2160p)" or "Downloading 43%".
    async movie(s, film) {
      if (!s.radarrApiKey) return { movie: null, state: null };
      const movie = (await this.get(s, `/movie?tmdbId=${film.tmdb}`))?.[0] || null;
      if (!movie) return { movie, state: "Not added" };
      if (movie.hasFile) return { movie, state: `Downloaded (${movie.movieFile?.quality?.quality?.name || "file on disk"})` };
      const queue = (await this.get(s, `/queue/details?movieId=${movie.id}`)) || [];
      const item = queue[0];
      if (item) return { movie, state: item.size ? `Downloading ${Math.round(((item.size - item.sizeleft) / item.size) * 100)}%` : "Queued" };
      return { movie, state: movie.monitored ? "Monitored, missing" : "Not monitored" };
    },
    link(s, film, movie) {
      return movie ? `${s.radarrUrl}/movie/${movie.titleSlug}` : `${s.radarrUrl}/add/new?term=${encodeURIComponent(`tmdb:${film.tmdb}`)}`;
    },
  };

  const deemix = {
    configured: (s) => s.deemixUrl,
    test: (s) => reach(s.deemixUrl),
    link: (s, album) => (album.deezerIds[0] ? `${s.deemixUrl}/album/${album.deezerIds[0]}` : `${s.deemixUrl}/search?term=${encodeURIComponent(albumQuery(album))}`),
  };

  const tidarr = {
    configured: (s) => s.tidarrUrl,
    test: (s) => reach(s.tidarrUrl),
    link: (s, album) => (album.tidalIds[0] ? `${s.tidarrUrl}/album/${album.tidalIds[0]}` : `${s.tidarrUrl}/search/${encodeURIComponent(albumQuery(album))}`),
  };

  const slskd = {
    configured: (s) => s.slskdUrl,
    test: (s) => reach(s.slskdUrl),
    link: (s) => `${s.slskdUrl}/searches`,
  };

  const sonarr = {
    configured: (s) => s.sonarrUrl,
    get(s, path) {
      return request(`${s.sonarrUrl}/api/v3${path}`, { "X-Api-Key": s.sonarrApiKey });
    },
    async test(s) {
      if (!s.sonarrApiKey) return reach(s.sonarrUrl);
      const status = await this.get(s, "/system/status");
      return `Connected to Sonarr ${status?.version || ""}`.trim();
    },
    term(show) {
      if (show.tvdb) return `tvdb:${show.tvdb}`;
      if (show.tmdb) return `tmdb:${show.tmdb}`;
      if (show.imdb) return `imdb:${show.imdb}`;
      return show.title;
    },
    // Returns the series (or null) and a short state such as "Complete, 62 episodes" or "50/62 episodes, 12 missing".
    async series(s, show) {
      if (!s.sonarrApiKey) return { series: null, state: null };
      const found = show.tvdb
        ? (await this.get(s, `/series?tvdbId=${show.tvdb}`))?.[0]
        : (await this.get(s, `/series/lookup?term=${encodeURIComponent(this.term(show))}`))?.find((result) => result.id);
      if (!found?.id) return { series: null, state: "Not added" };
      const series = (await this.get(s, `/series/${found.id}`)) || found;
      const stats = series.statistics || {};
      const have = stats.episodeFileCount || 0;
      const wanted = stats.episodeCount || 0;
      const state = have >= wanted ? `Complete, ${have} episodes` : `${have}/${wanted} episodes, ${wanted - have} missing`;
      return { series, state: series.monitored ? state : `${state}, not monitored` };
    },
    link(s, show, series) {
      return series ? `${s.sonarrUrl}/series/${series.titleSlug}` : `${s.sonarrUrl}/add/new?term=${encodeURIComponent(this.term(show))}`;
    },
  };

  const bandcamp = {
    configured: (s) => s.bandcampSearch === "on" && !/(^|\.)bandcamp\.com$/.test(location.hostname),
    test: () => reach("https://bandcamp.com/"),
    link: (s, album) => `https://bandcamp.com/search?q=${encodeURIComponent(albumQuery(album))}&item_type=a`,
  };

  const letterboxd = {
    configured: (s) => s.letterboxdUser,
    async test(s) {
      if ((await requestText(`https://letterboxd.com/${encodeURIComponent(s.letterboxdUser)}/`)) === null) throw new Error(`No Letterboxd member named ${s.letterboxdUser}`);
      return "Found your profile";
    },
    // A member's page for a film only exists once they've logged it. Only checked on Letterboxd itself, where a
    // same-origin request passes Letterboxd's bot protection.
    async logged(s, slug) {
      const res = await fetch(`${location.origin}/${encodeURIComponent(s.letterboxdUser)}/film/${slug}/`, { method: "HEAD", credentials: "include" });
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`Letterboxd answered HTTP ${res.status}`);
      return true;
    },
  };

  function albumQuery(album) {
    return `${album.artists[0] || ""} ${album.title}`.trim();
  }

  // ---------------------------------------------------------------------------
  // Library index (every album or film, cached for list and grid pages)
  // ---------------------------------------------------------------------------
  const SERVERS = { n: navidrome, p: plex, j: jellyfin, s: spotify, r: radarr, o: sonarr, d: deemix, t: tidarr, k: slskd, c: bandcamp, l: letterboxd };
  const SERVER_NAMES = { n: "Navidrome", p: "Plex", j: "Jellyfin", s: "Spotify", r: "Radarr", o: "Sonarr", d: "Deemix", t: "Tidarr", k: "slskd", c: "Bandcamp", l: "Letterboxd" };
  const INDEX_SOURCES = {
    music: [["n", navidrome], ["p", plex], ["j", jellyfin], ["s", spotify]],
    films: [["p", plex], ["j", jellyfin]],
    videos: [["p", plex], ["j", jellyfin]],
  };
  const INDEX_METHODS = { music: "indexAlbums", films: "indexFilms", videos: "indexVideos" };

  function matchKey(text) {
    return String(text || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&|\band\b/g, " ")
      .replace(/^\s*the\s+/, "")
      .replace(/[^\p{L}\p{N}]/gu, "");
  }

  function albumKeys(artist, title) {
    return titleKeys(artist, title).map((key) => `${matchKey(artist)}|${key}`);
  }

  function filmKey(title, year) {
    return `${matchKey(title)}|${year}`;
  }

  function artistVariants(album) {
    const names = [album.artist, ...(album.artists || [])].filter(Boolean);
    for (const name of [...names]) names.push(...name.split(/\s*(?:,|;|\/|&|\bfeat\.?|\bft\.?|\bwith\b)\s*/i));
    // A disambiguation suffix ("Ugly (UK)") that sites leave off.
    for (const name of [...names]) names.push(name.replace(/\s*\([^)]*\)\s*$/, ""));
    return [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  }

  function indexSignature(s, kind) {
    return JSON.stringify(INDEX_SOURCES[kind].filter(([, server]) => server.configured(s)).map(([code]) => code).concat(INDEX_VERSION, s.navidromeUrl, s.plexUrl, s.jellyfinUrl, s.spicetifyLibraryUrl));
  }

  function filmIdKeys(film) {
    return [film.tmdb && `tmdb:${film.type}:${film.tmdb}`, film.imdb && `imdb:${film.imdb}`, film.tvdb && `tvdb:${film.type}:${film.tvdb}`].filter(Boolean);
  }

  function recordKeys(kind, item) {
    if (kind === "videos") return [`youtube:${item.video}`];
    if (kind === "films") {
      const titles = [...new Set(item.titles.filter(Boolean))];
      const byYear = item.year ? titles.map((title) => filmKey(title, item.year)) : [];
      return [...byYear, ...filmIdKeys(item)];
    }
    const keys = artistVariants(item).flatMap((artist) => albumKeys(artist, item.title));
    const ids = [item.releaseId, item.groupId].filter(Boolean).map((id) => `mb:${id}`);
    return [...new Set([...keys, ...ids, ...(item.spotifyIds || []).map((id) => `spotify:${id}`)])];
  }

  function recordLabel(kind, item) {
    if (kind === "music") return `${item.artist || "Unknown artist"} — ${item.title}`;
    return `${item.titles[0]}${item.year ? ` (${item.year})` : ""}`;
  }

  // A cheap marker per service that changes when something is added (or, for films and videos, watched), so new media
  // and watched marks show up before the index expires.
  const LATEST = {
    n: async (s) => (await navidrome.call(s, "getAlbumList2", { type: "newest", size: "1" })).albumList2?.album?.[0]?.id,
    p: async (s, kind) => {
      const added = (await plex.get(s, "/library/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=1"))?.MediaContainer?.Metadata?.[0]?.ratingKey;
      if (kind === "music") return added;
      const viewed = (await plex.get(s, "/status/sessions/history/all?sort=viewedAt:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=1").catch(() => null))?.MediaContainer?.Metadata?.[0]?.viewedAt;
      return `${added}|${viewed || ""}`;
    },
    j: async (s, kind) => {
      const added = (await jellyfin.items(s, { SortBy: "DateCreated", SortOrder: "Descending", Limit: "1", IncludeItemTypes: kind === "music" ? "MusicAlbum" : "Movie,Series" }))[0]?.Id;
      if (kind === "music") return added;
      const played = (await jellyfin.items(s, { SortBy: "DatePlayed", SortOrder: "Descending", Limit: "1", Filters: "IsPlayed", IncludeItemTypes: "Movie,Episode", ...(await jellyfin.userData(s)) }).catch(() => []))[0];
      return `${added}|${played?.UserData?.LastPlayedDate || ""}`;
    },
    s: async (s) => (await request(`${s.spicetifyLibraryUrl}/api/meta`))?.library?.syncedAt,
  };

  async function latestMarkers(s, kind) {
    const sources = INDEX_SOURCES[kind].filter(([, server]) => server.configured(s));
    const values = await Promise.all(sources.map(([code]) => LATEST[code](s, kind).catch(() => null)));
    return Object.fromEntries(sources.map(([code], i) => [code, values[i] ?? null]));
  }

  // Groups each album's copies across services, so a match on any service's naming shows every service.
  // Copies are grouped by a shared artist and title, a shared MusicBrainz, TMDB or IMDb ID, or a title that only one album has
  // on each service (Plex and Spotify often credit a different artist, such as "Various Artists" or the composer).
  async function buildIndex(s, kind) {
    const sources = INDEX_SOURCES[kind].filter(([, server]) => server.configured(s));
    const [results, markers] = await Promise.all([
      Promise.allSettled(sources.map(([, server]) => server[INDEX_METHODS[kind]](s))),
      latestMarkers(s, kind),
    ]);
    const errors = {};
    const records = [];
    results.forEach((result, i) => {
      const code = sources[i][0];
      if (result.status === "rejected") {
        errors[code] = result.reason.message;
        return;
      }
      for (const item of result.value) {
        const music = kind === "music";
        records.push({
          code,
          id: item.id,
          keys: recordKeys(kind, item),
          ids: [item.releaseId, item.groupId].filter(Boolean),
          title: music ? matchKey(normalizeTitle(item.title)) : "",
          name: music ? normalizeTitle(item.title, true) : "",
          artists: music ? [...new Set(artistVariants(item).map(matchKey))] : [],
          label: recordLabel(kind, item),
          watched: !!item.watched,
        });
      }
    });

    const parent = records.map((_, i) => i);
    const find = (i) => {
      while (parent[i] !== i) i = parent[i] = parent[parent[i]];
      return i;
    };
    const linkBy = (keysOf) => {
      const first = new Map();
      records.forEach((record, i) => {
        for (const key of keysOf(record)) {
          if (first.has(key)) parent[find(i)] = find(first.get(key));
          else first.set(key, i);
        }
      });
    };
    linkBy((record) => record.keys);
    linkBy((record) => record.ids);
    const byTitle = new Map();
    records.forEach((record, i) => {
      if (record.title.length < 6) return;
      if (!byTitle.has(record.title)) byTitle.set(record.title, []);
      byTitle.get(record.title).push(i);
    });
    for (const list of byTitle.values()) {
      const codes = list.map((i) => records[i].code);
      if (list.length > 1 && new Set(codes).size === codes.length) for (const i of list.slice(1)) parent[find(i)] = find(list[0]);
    }

    const groups = [];
    const groupOf = new Map();
    const entries = {};
    const titlesByArtist = {};
    records.forEach((record, i) => {
      const root = find(i);
      if (!groupOf.has(root)) {
        groupOf.set(root, groups.length);
        groups.push({ _: record.label });
      }
      const group = groupOf.get(root);
      if (!groups[group][record.code]) groups[group][record.code] = record.id;
      if (record.watched) groups[group].w = 1;
      for (const key of record.keys) {
        if (!(key in entries)) entries[key] = group;
      }
      for (const artist of record.artists) {
        if (!titlesByArtist[artist]) titlesByArtist[artist] = [];
        if (!titlesByArtist[artist].some(([name, g]) => name === record.name && g === group)) titlesByArtist[artist].push([record.name, group]);
      }
    });
    const index = { sig: indexSignature(s, kind), builtAt: Date.now(), entries, groups, titlesByArtist, markers, errors };
    GM_setValue(`index:${kind}`, index);
    GM_setValue(`indexChecked:${kind}`, Date.now());
    for (const [code, message] of Object.entries(errors)) console.warn(`[Library Badges] ${SERVER_NAMES[code]} index failed: ${message}`);
    return index;
  }

  // Returns a cached index right away when there is one. It is rebuilt in the background when it expires, or sooner
  // when a quick check (at most every 15 minutes) shows something new was added to a library.
  async function loadIndex(s, kind, onRebuilt) {
    const stored = GM_getValue(`index:${kind}`, null);
    if (!stored || stored.sig !== indexSignature(s, kind)) return buildIndex(s, kind);
    const rebuild = () => buildIndex(s, kind).then(onRebuilt, () => {});
    if (Date.now() - stored.builtAt > INDEX_TTL) {
      rebuild();
    } else if (Date.now() - GM_getValue(`indexChecked:${kind}`, 0) > FRESHNESS_CHECK) {
      GM_setValue(`indexChecked:${kind}`, Date.now());
      latestMarkers(s, kind).then((markers) => {
        if (Object.entries(markers).some(([code, value]) => value !== null && value !== stored.markers?.[code])) rebuild();
      });
    }
    return stored;
  }

  function clearIndexes() {
    GM_setValue("index:music", null);
    GM_setValue("index:films", null);
    GM_setValue("index:videos", null);
    location.reload();
  }

  // ---------------------------------------------------------------------------
  // Links into each service
  // ---------------------------------------------------------------------------
  function makeHrefs(s, machine) {
    return {
      n: (id) => navidrome.link(s, { id }),
      p: (id) => plexHref(machine, id),
      j: (id) => jellyfin.link(s, { id }),
      s: (id) => `https://open.spotify.com/album/${id}`,
    };
  }

  // Search pages, for when an item isn't matched but might still be there under another name.
  const SEARCH = {
    n: (s, query) => `${s.navidromeUrl}/app/#/album/all?filter=${encodeURIComponent(JSON.stringify({ name: query }))}`,
    p: (s, query) => `https://app.plex.tv/desktop/#!/search?query=${encodeURIComponent(query)}`,
    j: (s, query) => `${s.jellyfinUrl}/web/#/search?query=${encodeURIComponent(query)}`,
    s: (s, query) => `https://open.spotify.com/search/${encodeURIComponent(query)}/albums`,
  };

  function formatSize(bytes) {
    if (!bytes) return "";
    return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
  }

  // ---------------------------------------------------------------------------
  // Markers on list and grid pages
  // ---------------------------------------------------------------------------
  const MARK_STYLE = `
    .lbm { display: inline-flex !important; align-items: center; gap: 4px; margin: 0 0 0 6px !important; padding: 3px 4px !important; border-radius: 4px;
      width: max-content !important; align-self: flex-start;
      background: rgba(12, 13, 18, 0.85) !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45); vertical-align: middle; line-height: 0; }
    .lbm a { display: inline-flex !important; line-height: 0; border: none !important; text-decoration: none !important; }
    .lbm svg { width: 13px !important; height: 13px !important; display: block; }
    .lbm a:hover { filter: brightness(1.3); }
    .lbm.lbm-poster { position: absolute !important; z-index: 5; margin: 4px 0 0 4px !important; }
    yt-thumbnail-view-model > .lbm.lbm-poster { top: 0; left: 0; }
    .lbm.lbm-get { position: relative; border: 1px dashed #6b7280; color: #d1d5db !important; font: 700 11px/13px system-ui, -apple-system, "Segoe UI", sans-serif !important; }
    .lbm.lbm-poster + .lbm.lbm-poster { margin-top: 30px !important; }
    .lbm.lbm-arr { border: 1px dashed #6b7280; }
    .lbm-progress { color: #fbbf24; font: 700 10px/13px system-ui, -apple-system, "Segoe UI", sans-serif; }
    .lbm-watched { color: #10b981; font: 700 11px/13px system-ui, -apple-system, "Segoe UI", sans-serif; }
    .lbm-dimmed img { opacity: 0.3 !important; transition: opacity 0.15s; }
    .lbm-dimmed:hover img { opacity: 1 !important; }
    .lbm.lbm-unmonitored { opacity: 0.55; }
    .lbm-get a { align-items: center; gap: 3px; color: inherit !important; line-height: 13px !important; }
    .lbm-more { all: unset; cursor: pointer; color: #9ca3af; font: 700 10px/13px system-ui, sans-serif; padding: 0 1px; }
    .lbm-more:hover { color: #fff; }
    .lbm-menu { position: absolute; top: calc(100% + 4px); left: 0; z-index: 6; display: flex; flex-direction: column; gap: 2px; padding: 4px;
      border-radius: 6px; background: #151821; border: 1px solid #374151; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); }
    .lbm-menu[hidden] { display: none !important; }
    .lbm-menu a { gap: 6px !important; padding: 4px 6px; border-radius: 4px; color: #e5e7eb !important; font: 600 12px/14px system-ui, -apple-system, "Segoe UI", sans-serif; white-space: nowrap; }
    .lbm-menu a:hover { background: #1f2430; }
    .release_navigation_links:has(> .prev_link > .lbm, > .next_link > .lbm) { overflow: visible; }
    .release_navigation_links .prev_link:has(> .lbm), .release_navigation_links .next_link:has(> .lbm) {
      display: flex; align-items: center; min-width: 0; overflow: visible;
    }
    .release_navigation_links .next_link:has(> .lbm) { justify-content: flex-end; }
    .release_navigation_links .prev_link:has(> .lbm) > a, .release_navigation_links .next_link:has(> .lbm) > a {
      min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .release_navigation_links .lbm { flex: none; align-self: center; }
  `;

  function createMarker(owned, hrefs, how, poster, note = null) {
    const marker = document.createElement("span");
    marker.className = poster ? "lbm lbm-poster" : "lbm";
    for (const [code, id] of Object.entries(owned)) {
      const link = document.createElement("a");
      link.append(iconSvg(code));
      link.title = `In ${SERVER_NAMES[code]} (matched by ${how})`;
      const href = hrefs[code](id);
      if (href) {
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener";
      }
      marker.append(link);
    }
    if (note?.progress) {
      const progress = document.createElement("span");
      progress.className = "lbm-progress";
      progress.textContent = note.progress;
      progress.title = `${note.progress} episodes in your library (from Sonarr)`;
      marker.append(progress);
    }
    if (note?.watched) {
      const watched = document.createElement("span");
      watched.className = "lbm-watched";
      watched.textContent = "✓";
      watched.title = "Watched";
      marker.append(watched);
    }
    return marker;
  }

  // Watched state from the index, and for an incomplete show Sonarr knows, the episodes you have of those aired.
  function ownedNote(kind, group, item) {
    if (kind !== "films" && kind !== "videos") return null;
    const sonarrEntry = kind === "films" && item ? arrEntry({ ...item, type: item.type || "tv" }) : null;
    const [code, , , have, total] = sonarrEntry || [];
    return { watched: !!group?.w, progress: code === "o" && total > have ? `${have}/${total}` : "" };
  }

  function orderedOwned(entry, kind) {
    const owned = {};
    for (const [code] of INDEX_SOURCES[kind]) if (entry?.[code]) owned[code] = entry[code];
    return Object.keys(owned).length ? owned : null;
  }

  function slugText(slug) {
    return decodeURIComponent(slug).replace(/[-_]+/g, " ");
  }

  function lookupGroup(index, keys) {
    for (const key of keys) if (key in index.entries) return index.groups[index.entries[key]];
    return null;
  }

  const COMPANION_ONLY = /^(?:the\s+)?(?:remix(?:es|ed)?|instrumentals?|a\s*cappellas?|acapellas?|live\b.*|demos?)$/;

  // Matches by artist and title. When no title matches exactly, a library album by the same artist whose title
  // continues the release's title counts too, so "BRAT" finds a library copy of "Brat and it's completely different
  // but also still brat", but a separate remix or instrumental album never stands in for the original. A title of two
  // or more words also finds one the library's title ends with ("Louder, Please" and "A Little Louder, Please").
  function lookupAlbum(index, artists, titles, parts = true) {
    const exact = lookupGroup(index, artists.flatMap((artist) => titles.flatMap((title) => albumKeys(artist, title))));
    if (exact) return exact;
    for (const artist of artists) {
      const albums = index.titlesByArtist?.[matchKey(artist)] || [];
      for (const title of titles) {
        const name = normalizeTitle(title, true);
        if (name.length < 3) continue;
        const hits = albums.filter(([other]) => (other.startsWith(`${name} `) && !COMPANION_ONLY.test(other.slice(name.length + 1))) || (name.includes(" ") && other.endsWith(` ${name}`)));
        if (hits.length && hits.every(([, group]) => group === hits[0][1])) return index.groups[hits[0][1]];
      }
    }
    const variant = lookupNameVariant(index, artists, titles);
    if (variant || !parts) return variant;
    // A release that combines two ("Towards The End / Where To Find Me", "Folklore I & II") counts when you have either
    // part, and a Portuguese or Spanish "e" or "y" reads as "&" ("Samantha E Adrian" and "Samantha & Adrian").
    const alternatives = titles.flatMap((title) => {
      const pieces = title.split(/\s+[/&+]\s+/);
      const numbered = pieces.map((piece, i) => (i > 0 && /^(?:[ivx]+|\d+)$/i.test(piece) ? pieces[0].replace(/\s+(?:[ivx]+|\d+)$/i, ` ${piece}`) : piece));
      const conjunction = title.replace(/\s+[ey]\s+/gi, " & ");
      return [...(pieces.length > 1 ? numbered : []), ...(conjunction !== title ? [conjunction] : [])];
    }).filter((title) => title.length > 2);
    return alternatives.length ? lookupAlbum(index, artists, alternatives, false) : null;
  }

  // Sites name artists differently from the library: a full name ("Stella Katherine Cole", "Samia Finnerty") where the
  // library has a shorter one ("Stella Cole", "Samia"), or family name first ("Aoba Ichiko" for "Ichiko Aoba"). As a
  // last resort, the same title counts by a library artist named the page's first name alone, the first and last names
  // with middle names left out, or (for two names) the other way round. Compilations credited to "Various" match a
  // title only one album in the library has.
  const keysByTitle = new WeakMap();

  function lookupNameVariant(index, artists, titles) {
    if (!keysByTitle.has(index)) {
      const byTitle = new Map();
      for (const [key, group] of Object.entries(index.entries)) {
        const split = key.indexOf("|");
        if (split < 1 || key.includes(":")) continue;
        const title = key.slice(split + 1);
        if (!byTitle.has(title)) byTitle.set(title, []);
        byTitle.get(title).push([key.slice(0, split), group]);
      }
      keysByTitle.set(index, byTitle);
    }
    const byTitle = keysByTitle.get(index);
    for (const artist of artists) {
      const titleHits = (title) => titleKeys(artist, title).flatMap((key) => byTitle.get(key) || []);
      if (/^various(?:\s+artists)?$/i.test(artist.trim())) {
        for (const title of titles) {
          const groups = new Set(titleHits(title).map(([, group]) => group));
          if (groups.size === 1) return index.groups[[...groups][0]];
        }
        continue;
      }
      const words = artist.split(/\s+/).map(matchKey).filter(Boolean);
      if (words.length < 2 || words.length > 6) continue;
      const names = new Set([words[0]]);
      if (words.length === 2) names.add(`${words[1]}${words[0]}`);
      for (let mask = 0; mask < 1 << (words.length - 2); mask++) {
        const middle = words.slice(1, -1).filter((_, i) => mask & (1 << i));
        if (middle.length < words.length - 2) names.add([words[0], ...middle, words.at(-1)].join(""));
      }
      for (const title of titles) {
        const hit = titleHits(title).find(([name]) => names.has(name));
        if (hit) return index.groups[hit[1]];
      }
    }
    return null;
  }

  function lookupRelease(index, artistSlug, titleSlug, text, extraArtists = []) {
    const title = slugText(titleSlug);
    return lookupAlbum(index, [slugText(artistSlug), ...extraArtists], [text, title, title.replace(/\s\d+$/, "")]);
  }

  // A film in the same year is a match; one a year off (release dates differ between sites) is only a candidate.
  function lookupFilm(index, title, year) {
    const exact = lookupGroup(index, [filmKey(title, year)]);
    if (exact) return { group: exact, exact: true };
    const near = lookupGroup(index, [filmKey(title, year - 1), filmKey(title, year + 1)]);
    return near ? { group: near, exact: false } : null;
  }

  // Album IDs per service from a RateYourMusic media-link block (release pages and chart rows), the default link first.
  function mediaIds(media, service) {
    let links = {};
    try {
      links = JSON.parse(media?.dataset.links || "{}");
    } catch {
      links = {};
    }
    return Object.entries(links[service] || {})
      .filter(([, v]) => isAlbum(v || {}))
      .sort(([, a], [, b]) => Number(!!b?.default) - Number(!!a?.default))
      .map(([id]) => id);
  }

  // Elements already scanned, with the item each was scanned for. Elements a page copies or reuses for another item
  // (YouTube, Bandcamp's discover page) are scanned again.
  let scanned = new WeakMap();
  let marked = new WeakSet();

  function alreadyScanned(el, key = "") {
    if (scanned.get(el) === key) return true;
    scanned.set(el, key);
    return false;
  }

  // Counts the items on a list or grid page that are in a library, shown in the corner of the page. Clicking the
  // counter lists them, with the ones you have first; a name scrolls to the item on the page.
  const tally = { items: new Map(), host: null, open: false, filter: "", hrefs: null, settings: null };

  function countItem(key, owned, { label = "", el = null, how = "", download = null, note = null } = {}) {
    const state = owned ? "have" : download?.arr ? "coming" : "missing";
    tally.items.set(key, { owned, label: label || key, el, how, download, note, state });
  }

  function resetTally() {
    tally.items.clear();
  }

  function tallyRow(item) {
    const row = document.createElement("li");
    const name = document.createElement("button");
    name.type = "button";
    name.textContent = item.label;
    name.addEventListener("click", () => item.el?.isConnected && item.el.scrollIntoView({ behavior: "smooth", block: "center" }));
    row.append(name);
    if (item.owned && tally.hrefs) row.append(createMarker(item.owned, tally.hrefs, item.how, false, item.note));
    const links = item.download && !item.download.arr ? downloadLinks(tally.settings, item.download) : [];
    if (item.download?.arr) row.append(createArrMarker(item.download.arr, false));
    else if (links.length) row.append(createGetMarker(links, false, true));
    return row;
  }

  const TALLY_STATES = [["have", "In your library", "Have"], ["coming", "On the way", "On the way"], ["missing", "Not in your library", "Missing"]];

  // What a download list needs: albums missing from Navidrome, and films and shows no library or arr has.
  function missingItems() {
    return [...tally.items.values()].filter((item) => item.state === "missing" || (item.download && !item.download.arr));
  }

  async function copyMissing(button) {
    const text = missingItems().map((item) => item.label).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch {
      prompt("Copy the missing items:", text);
    }
    setTimeout(() => (button.textContent = "Copy missing"), 1500);
  }

  function renderTallyList(panel) {
    const items = [...tally.items.values()];
    const counts = Object.fromEntries(TALLY_STATES.map(([state]) => [state, items.filter((item) => item.state === state).length]));
    if (tally.filter && !counts[tally.filter]) tally.filter = "";
    const tools = document.createElement("div");
    tools.className = "tools";
    for (const [state, , chipName] of [["", "", "All"], ...TALLY_STATES]) {
      if (state && !counts[state]) continue;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = tally.filter === state ? "chip active" : "chip";
      chip.textContent = state ? `${chipName} ${counts[state]}` : chipName;
      chip.addEventListener("click", () => {
        tally.filter = state;
        renderTallyList(panel);
      });
      tools.append(chip);
    }
    if (missingItems().length) {
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "chip copy";
      copy.textContent = "Copy missing";
      copy.title = "Copy the missing items, one per line";
      copy.addEventListener("click", () => copyMissing(copy));
      tools.append(copy);
    }
    panel.replaceChildren(tools);
    for (const [state, heading] of TALLY_STATES) {
      const list = items.filter((item) => item.state === state);
      if (!list.length || (tally.filter && tally.filter !== state)) continue;
      const title = document.createElement("h4");
      title.textContent = `${heading} (${list.length})`;
      const ul = document.createElement("ul");
      ul.append(...list.map(tallyRow));
      panel.append(title, ul);
    }
  }

  function renderTally() {
    if (tally.settings?.displayCounter === "off" || tally.items.size < 8) return tally.host?.remove();
    if (!tally.host) {
      tally.host = document.createElement("div");
      tally.host.id = "library-badges-tally";
      const shadow = tally.host.attachShadow({ mode: "open" });
      setHtml(shadow, `<style>
        :host { all: initial; position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; }
        .count, .panel { font: 600 12px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; letter-spacing: normal; text-align: left; }
        .count { display: block; margin-left: auto; padding: 7px 12px; border-radius: 999px; background: rgba(21, 24, 33, 0.92); border: 1px solid #10b981;
          color: #e5e7eb; cursor: pointer; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4); }
        .count:hover { background: #1f2430; }
        .count b { color: #10b981; }
        .count i { font-style: normal; color: #fbbf24; }
        .tools { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0 2px; }
        .chip { all: unset; padding: 3px 9px; border-radius: 999px; border: 1px solid #374151; color: #d1d5db; font-size: 11px; cursor: pointer; }
        .chip:hover { background: #1f2430; }
        .chip.active { border-color: #10b981; color: #10b981; }
        .chip.copy { margin-left: auto; }
        .panel { width: 340px; max-height: 60vh; overflow-y: auto; margin-bottom: 8px; padding: 4px 12px 10px; border-radius: 10px;
          background: #151821; border: 1px solid #374151; color: #e5e7eb; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); }
        .panel[hidden] { display: none; }
        h4 { margin: 10px 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }
        ul { list-style: none; margin: 0; padding: 0; }
        li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 0; border-top: 1px solid #1f2430; }
        li button { all: unset; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; cursor: pointer; }
        li button:hover { color: #10b981; }
        ${MARK_STYLE}
        .lbm { flex: none; margin: 0 !important; box-shadow: none; }
      </style><div class="panel" hidden></div><button type="button" class="count"></button>`);
      const panel = shadow.querySelector(".panel");
      shadow.querySelector(".count").addEventListener("click", () => {
        tally.open = !tally.open;
        panel.hidden = !tally.open;
        if (tally.open) renderTallyList(panel);
      });
    }
    if (!tally.host.isConnected) document.documentElement.append(tally.host);
    const items = [...tally.items.values()];
    const owned = items.filter((item) => item.state === "have").length;
    const coming = items.filter((item) => item.state === "coming").length;
    setHtml(tally.host.shadowRoot.querySelector(".count"), `<b>${owned}</b> of ${tally.items.size} on this page in your library${coming ? ` · <i>${coming} on the way</i>` : ""}`);
    if (tally.open) renderTallyList(tally.host.shadowRoot.querySelector(".panel"));
  }

  // Chart rows carry their own Spotify links, which match exactly; other links fall back to the artist and title in the URL.
  // On an artist page, a collaboration's link names every artist ("laufey-sinfoniuhljomsveit-islands"), so the page's
  // own artist is tried too when the link's artist includes it.
  function scanRym(index, hrefs) {
    const pageSlug = location.pathname.match(/^\/artist\/([^/]+)/)?.[1];
    const pageArtist = pageSlug ? document.querySelector("h1.artist_name_hdr")?.textContent.trim() || slugText(pageSlug) : "";
    for (const link of document.querySelectorAll('a[href*="/release/"]')) {
      if (link.closest(".release_navigation_guidance")) continue;
      if (alreadyScanned(link)) continue;
      const url = new URL(link.href, location.href);
      const match = url.pathname.match(/^\/release\/[^/]+\/([^/]+)\/([^/]+)\/?$/);
      const text = link.textContent.trim();
      if (!match || !text || url.hostname !== location.hostname || url.pathname === location.pathname) continue;
      const media = link.closest(".page_charts_section_charts_item")?.querySelector('[id^="media_link_button_container"]');
      const bySpotify = lookupGroup(index, mediaIds(media, "spotify").map((id) => `spotify:${id}`));
      const collaboration = pageArtist && match[1] !== pageSlug && `-${match[1]}-`.includes(`-${pageSlug}-`);
      const group = bySpotify || lookupRelease(index, match[1], match[2], text, collaboration ? [pageArtist] : []);
      const owned = orderedOwned(group, "music");
      const how = bySpotify ? "Spotify album ID" : "artist and title";
      const download = wantsDownload("music", group, { artists: [slugText(match[1])], title: text, deezerIds: mediaIds(media, "deezer") });
      countItem(url.pathname.replace(/\/$/, ""), owned, { label: `${slugText(match[1])} – ${text}`, el: link, how, download });
      removeMarkers(link);
      if (owned) placeMarker(link, owned, hrefs, how, null);
      placeGet(link, download, null);
    }
  }

  // Letterboxd's grids only carry a title and year. A match one year off is confirmed against the film's TMDB ID
  // from its page, fetched once and remembered.
  const TMDB_CACHE_KEY = "letterboxdTmdb";
  const TMDB_CACHE_LIMIT = 2000;
  let verifyQueue = Promise.resolve();

  function letterboxdTmdb(slug) {
    const cached = GM_getValue(TMDB_CACHE_KEY, {})[slug];
    if (cached !== undefined) return Promise.resolve(cached);
    const run = async () => {
      const res = await fetch(`${location.origin}/film/${slug}/`, { credentials: "include" });
      if (!res.ok) return null;
      const html = await res.text();
      const id = html.match(/data-tmdb-id="(\d+)"/)?.[1];
      const type = html.match(/data-tmdb-type="(\w+)"/)?.[1] === "tv" ? "tv" : "movie";
      const value = id ? `${type}:${id}` : null;
      const cache = GM_getValue(TMDB_CACHE_KEY, {});
      cache[slug] = value;
      const keys = Object.keys(cache);
      for (const old of keys.slice(0, Math.max(0, keys.length - TMDB_CACHE_LIMIT))) delete cache[old];
      GM_setValue(TMDB_CACHE_KEY, cache);
      return value;
    };
    const result = verifyQueue.then(run, run);
    verifyQueue = result.catch(() => null);
    return result;
  }

  function scanLetterboxd(index, hrefs) {
    const currentSlug = location.pathname.match(/^\/film\/([^/]+)/)?.[1];
    for (const poster of document.querySelectorAll("[data-item-slug][data-item-name]")) {
      if (alreadyScanned(poster, poster.dataset.itemSlug)) continue;
      const slug = poster.dataset.itemSlug;
      const match = poster.dataset.itemName.match(/^(.*)\s\((\d{4})\)$/);
      if (!match || slug === currentSlug) continue;
      const found = lookupFilm(index, match[1], Number(match[2]));
      const owned = orderedOwned(found?.group, "films");
      const holder = poster.parentElement;
      const mark = (how) => {
        const note = ownedNote("films", found.group, { type: "movie", title: match[1], year: match[2] });
        countItem(slug, owned, { label: poster.dataset.itemName, el: holder, how, note });
        renderTally();
        placeMarker(holder, owned, hrefs, how, holder, note);
      };
      if (!owned || !holder) {
        const download = wantsDownload("films", null, { type: "movie", title: match[1], year: match[2] });
        countItem(slug, null, { label: poster.dataset.itemName, el: poster, download });
        if (holder) placeGet(holder, download, holder);
      } else if (found.exact) {
        mark("title and year");
      } else {
        countItem(slug, null, { label: poster.dataset.itemName, el: holder });
        letterboxdTmdb(slug).then((tmdb) => {
          if (tmdb && lookupGroup(index, [`tmdb:${tmdb}`]) === found.group) mark("TMDB ID");
        }, () => {});
      }
    }
  }

  // Marks one link: in the corner when it wraps (or overlays) a cover or poster, otherwise right after the link text.
  function placeMarker(link, owned, hrefs, how, poster = link.querySelector("img") ? link : null, note = null) {
    attachMarker(link, createMarker(owned, hrefs, how, !!poster, note), poster);
    if (poster && tally.settings?.displayDim === "on") poster.classList.add("lbm-dimmed");
  }

  function placeGet(link, download, poster = link.querySelector("img") ? link : null) {
    if (download?.arr) return attachMarker(link, createArrMarker(download.arr, !!poster), poster);
    const links = download ? downloadLinks(tally.settings, download) : [];
    if (links.length) attachMarker(link, createGetMarker(links, !!poster), poster);
  }

  // Corner icons go first in the cover, absolutely positioned without offsets, so they sit at its top-left corner
  // without the page's own elements being repositioned (sites lay covers out relative to their own containers).
  function attachMarker(link, marker, poster) {
    marker.addEventListener("click", (event) => event.stopPropagation());
    if (poster) {
      const corner = poster.querySelectorAll(":scope > .lbm-poster");
      if (corner.length) corner[corner.length - 1].after(marker);
      else poster.prepend(marker);
      return;
    }
    let after = link;
    while (after.nextElementSibling?.classList.contains("lbm")) after = after.nextElementSibling;
    after.insertAdjacentElement("afterend", marker);
  }

  function removeMarkers(link) {
    for (const box of [link, link.parentElement].filter(Boolean)) {
      box.classList.remove("lbm-dimmed");
      for (const old of box.querySelectorAll(":scope > .lbm-poster")) old.remove();
    }
    for (const old of link.querySelectorAll(":scope > .lbm")) old.remove();
    while (link.nextElementSibling?.classList.contains("lbm")) link.nextElementSibling.remove();
  }

  // Albums get the ↓ while Navidrome (where downloads land) doesn't have them, films and shows while no library has
  // them. A film or show Radarr or Sonarr already has gets that service's icon instead, since it's on its way.
  function wantsDownload(kind, group, item) {
    const s = tally.settings;
    if (!s || s.displayGet === "off" || !item) return null;
    const missing = kind === "music" && navidrome.configured(s) ? !group?.n : !orderedOwned(group, kind);
    if (!missing || (kind !== "music" && kind !== "films")) return null;
    return { kind, item, arr: kind === "films" ? arrEntry(item) : null };
  }

  // What Radarr and Sonarr already have, by TMDB, IMDb or TVDB ID and by title and year, as [code, title slug,
  // monitored]. Radarr's full list is large, so it's cached for 30 minutes; clicking a film's or show's ↓ expires it,
  // and coming back to the tab fetches it again, so what you just added shows its icon.
  const ARR_KEY = "arrItems";
  const ARR_TTL = 30 * 60 * 1000;
  let arrItems = {};
  let arrLoading = null;

  async function fetchArrItems(s) {
    const items = {};
    const add = (keys, entry) => {
      for (const key of keys) if (key && !(key in items)) items[key] = entry;
    };
    if (radarr.configured(s) && s.radarrApiKey) {
      for (const movie of (await radarr.get(s, "/movie")) || []) {
        add([movie.tmdbId && `tmdb:movie:${movie.tmdbId}`, movie.imdbId && `imdb:${movie.imdbId}`, movie.year && filmKey(movie.title, movie.year)], ["r", movie.titleSlug, movie.monitored ? 1 : 0]);
      }
    }
    if (sonarr.configured(s) && s.sonarrApiKey) {
      for (const series of (await sonarr.get(s, "/series")) || []) {
        const keys = [series.tmdbId && `tmdb:tv:${series.tmdbId}`, series.tvdbId && `tvdb:tv:${series.tvdbId}`, series.imdbId && `imdb:${series.imdbId}`];
        const stats = series.statistics || {};
        add([...keys, series.year && filmKey(series.title, series.year)], ["o", series.titleSlug, series.monitored ? 1 : 0, stats.episodeFileCount || 0, stats.episodeCount || 0]);
      }
    }
    return items;
  }

  function loadArrItems(s, onFresh) {
    if (arrLoading || (!(radarr.configured(s) && s.radarrApiKey) && !(sonarr.configured(s) && s.sonarrApiKey))) return;
    const sig = `${INDEX_VERSION}|${s.radarrUrl}|${s.sonarrUrl}`;
    const cached = GM_getValue(ARR_KEY, null);
    if (cached?.sig === sig) {
      arrItems = cached.items;
      if (Date.now() - cached.builtAt < ARR_TTL) return;
    }
    arrLoading = fetchArrItems(s).then((items) => {
      GM_setValue(ARR_KEY, { sig, builtAt: Date.now(), items });
      arrItems = items;
      onFresh();
    }, () => {}).finally(() => {
      arrLoading = null;
    });
  }

  function expireArrItems() {
    const cached = GM_getValue(ARR_KEY, null);
    if (cached) GM_setValue(ARR_KEY, { ...cached, builtAt: 0 });
  }

  function arrEntry(item) {
    const keys = [
      item.tmdb && `tmdb:${item.type || "movie"}:${item.tmdb}`,
      item.imdb && `imdb:${item.imdb}`,
      item.year && filmKey(item.title, Number(item.year)),
    ];
    for (const key of keys) if (key && arrItems[key]) return arrItems[key];
    return null;
  }

  function createArrMarker([code, slug, monitored], poster) {
    const s = tally.settings;
    const marker = document.createElement("span");
    marker.className = `lbm lbm-arr${monitored ? "" : " lbm-unmonitored"}${poster ? " lbm-poster" : ""}`;
    const link = document.createElement("a");
    link.href = code === "r" ? `${s.radarrUrl}/movie/${slug}` : `${s.sonarrUrl}/series/${slug}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.title = `In ${SERVER_NAMES[code]}, ${monitored ? "monitored and waiting to download" : "not monitored"}`;
    link.append(iconSvg(code));
    marker.append(link);
    return marker;
  }

  // Where a missing item can be downloaded or added, the chosen default first. Albums carry their artists, title and
  // Deezer IDs; films and shows their type, title and year.
  function downloadLinks(s, { kind, item }) {
    if (!s) return [];
    if (kind === "music") {
      const album = { artists: item.artists || [], title: item.title, deezerIds: item.deezerIds || [], tidalIds: [] };
      const preferred = s.musicDownloader || "d";
      return configuredCodes(s, [["d", deemix], ["t", tidarr], ["k", slskd], ["c", bandcamp]])
        .sort((a, b) => (b === preferred) - (a === preferred))
        .map((code) => ({ code, href: SERVERS[code].link(s, album), title: code === "k" ? "Open slskd's search page" : `${code === "c" ? "Buy" : "Download"} "${albumQuery(album)}" with ${SERVER_NAMES[code]}` }));
    }
    const links = [];
    if (item.type !== "tv" && radarr.configured(s)) links.push({ code: "r", href: radarrAddLink(s, item), title: `Add "${item.title}" in Radarr` });
    if (item.type !== "movie" && sonarr.configured(s)) links.push({ code: "o", href: sonarr.link(s, item, null), title: `Add "${item.title}" in Sonarr` });
    return links;
  }

  // The ↓ opens the first link; ▾ lists the others. The counter's list shows every link instead.
  function createGetMarker(links, poster, expanded = false) {
    const marker = document.createElement("span");
    marker.className = poster ? "lbm lbm-get lbm-poster" : "lbm lbm-get";
    const anchor = (link, text) => {
      const a = document.createElement("a");
      a.href = link.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.title = link.title;
      a.append(...(text ? [text] : []), iconSvg(link.code));
      if (link.code === "r" || link.code === "o") a.addEventListener("click", expireArrItems);
      return a;
    };
    if (expanded) {
      marker.append("↓", ...links.map((link) => anchor(link)));
      return marker;
    }
    marker.append(anchor(links[0], "↓"));
    if (links.length > 1) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "lbm-more";
      more.textContent = "▾";
      more.title = "Other downloaders";
      const menu = document.createElement("span");
      menu.className = "lbm-menu";
      menu.hidden = true;
      for (const link of links.slice(1)) {
        const a = anchor(link);
        a.append(SERVER_NAMES[link.code]);
        menu.append(a);
      }
      more.addEventListener("click", (event) => {
        event.preventDefault();
        menu.hidden = !menu.hidden;
      });
      marker.append(more, menu);
    }
    return marker;
  }

  // Discogs names artists with a number for disambiguation ("Tinashe (2)") and an asterisk for name variations.
  function discogsName(text) {
    const name = text.replace(/\*$/, "").replace(/\s*\(\d+\)$/, "").trim();
    return name === "Various" ? "Various Artists" : name;
  }

  // Discogs artist pages list releases by title, with the artist in the header; collections, wantlists, labels and
  // search results show the artist on each card. Expanded versions of an album, and the version tables on master and
  // release pages, are left alone so each album is marked once.
  const scanDiscogs = linkScanner('a[href*="/master/"], a[href*="/release/"]', "music",
    (url) => {
      const [, type, id] = url.pathname.match(/^\/(?:[a-z]{2}\/)?(master|release)\/(\d+)/) || [];
      if (!type || (type === "release" && /^\/(?:[a-z]{2}\/)?(?:master|release)\//.test(location.pathname))) return null;
      return `${type}:${id}`;
    },
    (index, link, key, label) => {
      const pageArtist = /^\/(?:[a-z]{2}\/)?artist\//.test(location.pathname) ? document.querySelector("h1")?.textContent : "";
      // The artist comes from the item's own card; a link outside any card (Discogs' "Random Item") is skipped.
      let card = link.parentElement;
      for (let depth = 0; card && depth < 5 && !card.querySelector('a[href*="/artist/"]'); depth++) card = card.parentElement;
      const items = new Set([...(card?.querySelectorAll('a[href*="/master/"], a[href*="/release/"]') || [])].map((other) => other.getAttribute("href").match(/\/(?:master|release)\/(\d+)/)?.[1]));
      if (!pageArtist && items.size > 1) return { skip: true };
      const artist = discogsName(pageArtist || card?.querySelector('a[href*="/artist/"]')?.textContent || "");
      if (!artist) return { skip: true };
      const item = { artists: [artist], title: label };
      return { group: lookupAlbum(index, item.artists, [label]), how: "artist and title", label: `${artist} – ${label}`, item };
    },
    '[class*="versionsTextWithCoversRow"], [class*="mobileStacked"], [class*="mobileVersions"]');

  // Bandcamp lists albums in artist discography grids, "more from" sidebars, recommendations under albums, track pages
  // (the album they're from), fan collections, search results and the discover page. The discover page reuses its
  // cards for other albums when the filters change, so each card remembers which album it was marked for.
  function bandcampItems() {
    const band = document.querySelector("#band-name-location .title")?.textContent.trim() || document.querySelector('meta[property="og:site_name"]')?.content || "";
    const byline = (el) => el?.textContent.replace(/^\s*by\s+/i, "").trim() || "";
    const items = [];
    for (const item of document.querySelectorAll(".music-grid-item")) {
      const titleEl = item.querySelector(".title");
      const override = titleEl?.querySelector(".artist-override");
      const title = [...(titleEl?.childNodes || [])].filter((node) => node !== override).map((node) => node.textContent).join("").trim();
      items.push({ item, link: item.querySelector('a[href*="/album/"]'), title, artist: override?.textContent.trim() || band });
    }
    for (const item of document.querySelectorAll(".trackTitle")) {
      const link = item.querySelector('a[href*="/album/"]');
      items.push({ item, link, title: link?.textContent.trim(), artist: band, poster: item.closest("li")?.querySelector("a.thumbthumb") });
    }
    for (const item of document.querySelectorAll("li.recommended-album")) {
      items.push({ item, link: item.querySelector("a.album-link"), title: item.dataset.albumtitle, artist: item.dataset.artist, poster: item.querySelector(".album-art-container") });
    }
    for (const item of document.querySelectorAll(".collection-item-container")) {
      const title = item.querySelector(".collection-item-title")?.firstChild?.textContent.trim();
      items.push({ item, link: item.querySelector('a[href*="/album/"]'), title, artist: byline(item.querySelector(".collection-item-artist")) });
    }
    for (const item of document.querySelectorAll("li.searchresult")) {
      if (item.querySelector(".itemtype")?.textContent.trim().toUpperCase() !== "ALBUM") continue;
      const link = item.querySelector(".heading a");
      items.push({ item, link, title: link?.textContent.trim(), artist: byline(item.querySelector(".subhead")), poster: item.querySelector(".artcont .art") });
    }
    for (const item of document.querySelectorAll("li.tralbum-card")) {
      const title = item.querySelector(".title")?.textContent.trim();
      items.push({ item, link: item.querySelector('a.stretch-link[href*="/album/"]'), title, artist: byline(item.querySelector(".attribution-meta")), poster: item.querySelector(".image-container") });
    }
    const nameLink = document.querySelector('#name-section a[href*="/album/"]');
    if (nameLink) items.push({ item: nameLink, link: nameLink, title: nameLink.textContent.trim(), artist: band });
    return items;
  }

  function scanBandcamp(index, hrefs) {
    trackTallyPage();
    for (const { item, link, title, artist, poster } of bandcampItems()) {
      if (!link || !title || !artist) continue;
      const url = new URL(link.href, location.href);
      const key = url.origin + url.pathname;
      if (url.pathname === location.pathname || alreadyScanned(item, key)) continue;
      for (const old of item.querySelectorAll(".lbm")) old.remove();
      for (const dimmed of item.querySelectorAll(".lbm-dimmed")) dimmed.classList.remove("lbm-dimmed");
      const group = lookupAlbum(index, [artist], [title]);
      const owned = orderedOwned(group, "music");
      const download = wantsDownload("music", group, { artists: [artist], title });
      countItem(key, owned, { label: `${artist} – ${title}`, el: item, how: "artist and title", download });
      const cover = poster ?? (link.querySelector("img") ? link : null);
      if (owned) placeMarker(link, owned, hrefs, "artist and title", cover);
      placeGet(link, download, cover);
    }
  }

  // Most sites link each item from a URL that names it. keyOf(url) names the item (null for other links), and
  // find(index, link, key, label) returns { group, how, item }, where label is the item's title from the link or its
  // cover and item describes it for the ↓ download links. A site can also return the cover box the icons go in.
  // Rows and cards often link an item from both its cover and its title; only one gets a marker: a cover big enough
  // to hold the icons in its corner, otherwise the title. Links remember which item they were marked for, since
  // single-page sites reuse them for other items.
  function linkText(link) {
    return link.querySelector("img")?.alt?.trim() || link.textContent.replace(/\s+/g, " ").trim();
  }

  function linkTwins(link, selector, key, keyOf, skip) {
    let row = link.parentElement;
    for (let depth = 0; row && depth < 4; depth++, row = row.parentElement) {
      const twins = [...row.querySelectorAll(selector)].filter((other) => other !== link && !other.closest(skip) && keyOf(new URL(other.href, location.href)) === key);
      if (twins.length) return twins;
    }
    return [];
  }

  function preferredLink(link, twins) {
    const cover = (el) => !!el.querySelector("img");
    const big = (el) => {
      const img = el.querySelector("img");
      return !!img && (Number(img.getAttribute("width")) || img.getBoundingClientRect?.().width || el.parentElement?.getBoundingClientRect?.().width || 0) >= 100;
    };
    const titles = twins.filter((twin) => !cover(twin) && twin.textContent.trim());
    if (cover(link)) return big(link) || !titles.length;
    // An empty link (a cover with no art) never carries the marker while the item has a title link.
    if (!link.textContent.trim()) return !titles.length && !twins.some(cover);
    return !twins.some(big) && !titles.some((twin) => twin.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function linkScanner(selector, kind, keyOf, find, exclude = "") {
    const skip = `#library-badges, .lbm, [aria-hidden='true']${exclude ? `, ${exclude}` : ""}`;
    return (index, hrefs) => {
      trackTallyPage();
      const current = keyOf(new URL(location.href));
      for (const link of document.querySelectorAll(selector)) {
        const url = new URL(link.href, location.href);
        const key = url.hostname === location.hostname ? keyOf(url) : null;
        if (!key || key === current || link.closest(skip) || alreadyScanned(link, key)) continue;
        removeMarkers(link);
        const twins = linkTwins(link, selector, key, keyOf, skip);
        if (twins.some((twin) => marked.has(twin)) || !preferredLink(link, twins)) continue;
        marked.add(link);
        const named = [link, ...twins].filter((el) => !el.querySelector("img") && el.textContent.trim());
        const label = [...named, link, ...twins].map(linkText).find(Boolean) || "";
        const found = find(index, link, key, label);
        if (found?.skip) continue;
        const owned = orderedOwned(found?.group, kind);
        const download = wantsDownload(kind, found?.group, found?.item);
        const note = owned ? ownedNote(kind, found.group, found.item) : null;
        countItem(key, owned, { label: found?.label || label, el: link, how: found?.how, download, note });
        if (owned) placeMarker(link, owned, hrefs, found.how, found.cover, note);
        placeGet(link, download, found.cover);
      }
    };
  }

  const scanMusicBrainz = linkScanner('a[href*="/release-group/"], a[href*="/release/"]', "music",
    (url) => url.pathname.match(/^\/release(?:-group)?\/([0-9a-f-]{36})\/?$/)?.[1],
    (index, link, mbid, label) => {
      if (location.pathname.includes(mbid) || document.querySelector(`.releaseheader a[href*="${mbid}"]`)) return { skip: true };
      const artist = document.querySelector(".artistheader h1 a, .rgheader .subheader a[href*='/artist/']")?.textContent.trim();
      const item = { artists: artist ? [artist] : [], title: label };
      const byId = lookupGroup(index, [`mb:${mbid}`]);
      if (byId) return { group: byId, how: "MusicBrainz ID", item };
      return { group: artist ? lookupAlbum(index, [artist], [label]) : null, how: "artist and title", item };
    }, ".releaseheader, .rgheader");

  // Album of the Year blocks show the artist above the title, artist pages only in the header, and chart rows
  // "Artist - Title" in one link.
  const scanAoty = linkScanner('a[href^="/album/"]', "music",
    (url) => url.pathname.match(/^\/album\/(\d+)-/)?.[1],
    (index, link, id, label) => {
      const block = link.closest(".albumBlock, .albumListRow");
      let title = block?.querySelector(".albumTitle")?.textContent.trim() || label;
      let artist = block?.querySelector(".artistTitle")?.textContent.trim() || document.querySelector(".artistHeadline")?.textContent.trim();
      if (!artist && title.includes(" - ")) [artist, title] = [title.slice(0, title.indexOf(" - ")), title.slice(title.indexOf(" - ") + 3)];
      const artists = artist ? artistVariants({ artist }) : [];
      // The cover box holds the icons even when the cover is hidden behind a lock.
      const cover = block?.querySelector(".image, .albumListCover") || undefined;
      return { group: artists.length ? lookupAlbum(index, artists, [title]) : null, how: "artist and title", item: { artists, title }, cover };
    });

  // The Fork's and The Drop's cards and list rows aren't links; each carries the review's ID, artist and title. Filters
  // re-render the grid without changing the address, so the count starts over once an item it counted is gone.
  function scanFork(index, hrefs) {
    if ([...tally.items.values()].some((item) => !item.el?.isConnected)) {
      resetTally();
      scanned = new WeakMap();
    }
    for (const card of document.querySelectorAll(".album-card[data-album-id], .list-row[data-album-id]")) {
      const id = card.dataset.albumId;
      if (alreadyScanned(card, id)) continue;
      // List rows put the Best New Music tag inside the artist cell.
      const artistCell = card.querySelector(".album-artist, .list-artist");
      const artist = [...(artistCell?.childNodes || [])].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join("").trim();
      const titleCell = card.querySelector(".album-title, .list-album");
      const title = titleCell?.textContent.trim();
      if (!artist || !title) continue;
      const cover = card.querySelector(".album-cover");
      let link = cover;
      if (!cover) {
        link = titleCell.querySelector(":scope > .lbm-after") || titleCell.appendChild(document.createElement("span"));
        link.className = "lbm-after";
      }
      removeMarkers(link);
      const artists = artistVariants({ artist });
      const item = { artists, title };
      const group = lookupAlbum(index, artists, [title]);
      const owned = orderedOwned(group, "music");
      const download = wantsDownload("music", group, item);
      const note = owned ? ownedNote("music", group, item) : null;
      countItem(id, owned, { label: `${artist} – ${title}`, el: card, how: "artist and title", download, note });
      if (owned) placeMarker(link, owned, hrefs, "artist and title", cover, note);
      placeGet(link, download, cover);
    }
  }

  // Pages that swap their results without reloading start a new count when the address changes.
  let tallyPage = "";

  function trackTallyPage() {
    const page = location.pathname + location.search;
    if (page === tallyPage) return;
    tallyPage = page;
    resetTally();
  }

  // YouTube reuses thumbnail elements for other videos as you browse, so each thumbnail remembers which video it was marked for.
  function scanYoutube(index, hrefs) {
    trackTallyPage();
    const seen = new WeakSet();
    for (const link of document.querySelectorAll('a[href*="/watch?v="], a[href^="/shorts/"]')) {
      const href = link.getAttribute("href");
      const video = href.match(/[?&]v=([\w-]{11})/)?.[1] || href.match(/^\/shorts\/([\w-]{11})/)?.[1];
      if (!video || !link.querySelector("img")) continue;
      const renderer = link.closest("ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer") || link.closest("yt-lockup-view-model");
      const poster = link.closest("ytd-thumbnail") || link.querySelector("ytd-thumbnail, yt-thumbnail-view-model") || link;
      const target = renderer || poster;
      if (seen.has(target)) continue;
      seen.add(target);
      const group = lookupGroup(index, [`youtube:${video}`]);
      const owned = orderedOwned(group, "videos");
      const oldMarkers = target.querySelectorAll(".lbm");
      if (alreadyScanned(target, video) && oldMarkers.length === (owned ? 1 : 0)) continue;
      if (renderer) {
        oldMarkers.forEach((marker) => marker.remove());
        renderer.querySelectorAll(".lbm-dimmed").forEach((element) => element.classList.remove("lbm-dimmed"));
      } else {
        removeMarkers(link);
      }
      const label = renderer?.querySelector("#video-title, h3, .yt-lockup-metadata-view-model__title")?.textContent.trim() || link.title || video;
      const note = owned ? ownedNote("videos", group, null) : null;
      countItem(video, owned, { label, el: link, how: "video ID", note });
      if (owned) placeMarker(link, owned, hrefs, "video ID", poster, note);
    }
  }

  // Loads the index, scans list pages (when the site has a scanner), and calls onIndex for the page's own badges.
  // Sites that change pages without reloading call this once per page, but only one observer rescans the page.
  let markerIndex = null;
  let markerObserver = null;

  async function startMarkers(s, kind, scan, onIndex) {
    const hasSources = INDEX_SOURCES[kind].some(([, server]) => server.configured(s));
    const hasActions = kind === "music"
      ? configuredCodes(s, [["d", deemix], ["t", tidarr], ["k", slskd], ["c", bandcamp]]).length > 0
      : kind === "films" && (radarr.configured(s) || sonarr.configured(s));
    if (!hasSources && !hasActions) return;
    const machine = plex.configured(s) ? await plex.machine(s).catch(() => "") : "";
    const hrefs = makeHrefs(s, machine);
    tally.hrefs = hrefs;
    tally.settings = s;
    const rescan = (index) => {
      if (!scan) return;
      scan(index, hrefs);
      renderTally();
    };

    if (scan && !document.getElementById("library-badges-marks")) {
      const style = document.createElement("style");
      style.id = "library-badges-marks";
      style.textContent = MARK_STYLE + (s.displayListIcons === "off" ? ".lbm:not(.lbm-get):not(.lbm-arr) { display: none !important; }" : "");
      document.head.append(style);
    }

    const refresh = (fresh) => {
      for (const marker of document.querySelectorAll(".lbm")) marker.remove();
      for (const dimmed of document.querySelectorAll(".lbm-dimmed")) dimmed.classList.remove("lbm-dimmed");
      scanned = new WeakMap();
      marked = new WeakSet();
      resetTally();
      rescan(fresh);
    };
    if (kind === "films" && scan) {
      const reloadArr = () => loadArrItems(s, () => markerIndex && refresh(markerIndex));
      reloadArr();
      if (!markerObserver) document.addEventListener("visibilitychange", () => document.hidden || reloadArr());
    }
    const index = hasSources ? await loadIndex(s, kind, (rebuilt) => {
      markerIndex = rebuilt;
      refresh(rebuilt);
      onIndex?.(rebuilt, hrefs);
    }) : { entries: {}, groups: [], titlesByArtist: {}, markers: {}, errors: {} };
    if (scan) markerIndex = index;
    rescan(index);
    onIndex?.(index, hrefs);
    if (!scan || markerObserver) return;

    let timer = null;
    markerObserver = new MutationObserver(() => {
      if (timer || document.hidden) return;
      timer = setTimeout(() => {
        timer = null;
        rescan(markerIndex);
      }, 50);
    });
    markerObserver.observe(document.body, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------------------------
  // Badges
  // ---------------------------------------------------------------------------
  const STYLE = `
    :host { all: initial; display: block; }
    .row { display: flex; flex-wrap: wrap; gap: 8px 10px; padding: 10px 0 14px; font: 600 12px/1 system-ui, -apple-system, "Segoe UI", sans-serif; }
    a { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px 6px 9px; border-radius: 999px; border: 1px solid #4b5563;
      background: #151821; color: #e5e7eb; text-decoration: none; white-space: nowrap; cursor: default; }
    a[href] { cursor: pointer; }
    a[href]:hover { background: #1f2430; }
    svg { width: 14px; height: 14px; flex: none; }
    .mark { font-weight: 700; }
    .note { font-weight: 500; color: #9ca3af; }
    .checking { opacity: 0.7; }
    .owned { border-color: #10b981; }
    .owned .mark { color: #10b981; }
    .missing { color: #9ca3af; }
    .missing svg { filter: grayscale(1); opacity: 0.6; }
    .action { border-style: dashed; border-color: #6b7280; }
    .action .mark { color: #9ca3af; }
    .error { border-color: #f87171; }
    .error .mark { color: #f87171; }
  `;
  const MARKS = { checking: "…", owned: "✓", missing: "✕", action: "↗", error: "!" };

  function createBadgeRow(anchor, position = "afterend") {
    document.getElementById("library-badges")?.remove();
    const host = document.createElement("div");
    host.id = "library-badges";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    const row = document.createElement("div");
    row.className = "row";
    shadow.append(style, row);
    anchor.insertAdjacentElement(position, host);

    return (code, label = SERVER_NAMES[code]) => {
      const pill = document.createElement("a");
      row.append(pill);
      const set = (state, { href = null, title = "", note = "" } = {}) => {
        const mark = document.createElement("span");
        mark.className = "mark";
        mark.textContent = MARKS[state];
        const parts = [...(code ? [iconSvg(code)] : []), label];
        if (note) {
          const span = document.createElement("span");
          span.className = "note";
          span.textContent = note;
          parts.push(span);
        }
        pill.className = state;
        pill.replaceChildren(...parts, mark);
        pill.title = title;
        if (href) {
          pill.href = href;
          pill.target = "_blank";
          pill.rel = "noopener";
        } else {
          pill.removeAttribute("href");
        }
      };
      set("checking", { title: `Checking ${label}…` });
      set.pill = pill;
      return set;
    };
  }

  function showSetup(anchor) {
    const set = createBadgeRow(anchor)(null, "Library Badges");
    set("checking", { href: "#", title: "No servers are configured yet. Click to open the settings." });
    set.pill.className = "owned";
    set.pill.textContent = "⚙ Set up Library Badges";
    set.pill.removeAttribute("target");
    set.pill.addEventListener("click", (event) => {
      event.preventDefault();
      openSettings();
    });
  }

  function configuredCodes(s, list) {
    return list.filter(([, server]) => server.configured(s)).map(([code]) => code);
  }

  // Release pages use the same library index as list pages. The page's Spotify link finds the album among your saved
  // Spotify albums and every service grouped with it; otherwise artist and title decide.
  function runAlbumPage(s, album, scan) {
    const libraries = configuredCodes(s, INDEX_SOURCES.music);
    const downloads = configuredCodes(s, [["d", deemix], ["t", tidarr], ["k", slskd], ["c", bandcamp]]);
    if (!libraries.length && !downloads.length) return showSetup(album.anchor);

    const addBadge = createBadgeRow(album.anchor, album.position);
    const setters = libraries.map((code) => [code, addBadge(code)]);
    let downloadSetters = null;
    startMarkers(s, "music", scan, (index, hrefs) => {
      const byMbid = lookupGroup(index, album.mbids.map((id) => `mb:${id}`));
      const bySpotify = byMbid ? null : lookupGroup(index, album.spotifyIds.map((id) => `spotify:${id}`));
      const group = byMbid || bySpotify || lookupAlbum(index, album.artists, [album.title]);
      const how = byMbid ? "MusicBrainz ID" : bySpotify ? "Spotify album ID" : "artist and title";
      for (const [code, set] of setters) {
        const name = SERVER_NAMES[code];
        if (index.errors[code]) {
          set("error", { title: `${name}: ${index.errors[code]}` });
        } else if (group?.[code]) {
          set("owned", { href: hrefs[code](group[code]), title: `In ${name} (matched by ${how})` });
        } else {
          const query = code === "n" ? album.title : albumQuery(album);
          const href = code === "s" && album.spotifyIds[0] ? `https://open.spotify.com/album/${album.spotifyIds[0]}` : SEARCH[code](s, query);
          set("missing", { href, title: `Not found in ${name}. Click to ${code === "s" && album.spotifyIds[0] ? "open the album on Spotify" : `search ${name} for "${query}"`}.` });
        }
      }

      // Download links only matter while the album is missing from the library downloads land in.
      if (group?.n) {
        for (const [, set] of downloadSetters || []) set.pill.remove();
        downloadSetters = null;
      } else if (!downloadSetters) {
        downloadSetters = downloads.map((code) => [code, addBadge(code)]);
        for (const [code, set] of downloadSetters) {
          const server = SERVERS[code];
          const exact = (code === "d" && album.deezerIds[0]) || (code === "t" && album.tidalIds[0]);
          set("action", {
            href: server.link(s, album),
            note: exact ? "album" : "search",
            title: code === "k" ? "Open slskd's search page" : `Open ${exact ? "the album" : `a search for "${albumQuery(album)}"`} in ${SERVER_NAMES[code]} to ${code === "c" ? "buy" : "download"} it`,
          });
        }
      }
    });
  }

  // Film pages match by TMDB ID through the index, falling back to title and year.
  function findFilm(index, film) {
    const byId = lookupGroup(index, filmIdKeys(film));
    if (byId) return { group: byId, how: "TMDB ID" };
    const near = film.title && film.year ? lookupFilm(index, film.title, Number(film.year)) : null;
    return near?.exact ? { group: near.group, how: "title and year" } : { group: null, how: "" };
  }

  function runFilmPage(s, film, scan) {
    const tv = film.type === "tv";
    const libraries = configuredCodes(s, INDEX_SOURCES.films);
    const actions = tv ? [] : configuredCodes(s, [["r", radarr]]);
    const showSonarrPill = tv && sonarr.configured(s);
    if (!libraries.length && !actions.length && !showSonarrPill) return showSetup(film.anchor);

    const addBadge = createBadgeRow(film.anchor);
    const setters = libraries.map((code) => [code, addBadge(code)]);
    if (showSonarrPill) showSonarr(s, film, addBadge("o"));
    let actionSetters = null;
    let upgradeSet = null;
    startMarkers(s, "films", scan, (index, hrefs) => {
      const { group, how } = findFilm(index, film);
      for (const [code, set] of setters) {
        const name = SERVER_NAMES[code];
        if (index.errors[code]) {
          set("error", { title: `${name}: ${index.errors[code]}` });
        } else if (group?.[code]) {
          showOwned(s, code, set, hrefs[code], group[code], how, film).then((details) => {
            // A film you only have in SD or 720p links to Radarr, where you can search for a better copy.
            if (tv || upgradeSet || !radarr.configured(s) || !["720p", "SD"].includes(details?.resolution)) return;
            upgradeSet = addBadge("r");
            showRadarr(s, film, upgradeSet, details.resolution);
          }, () => {});
        } else {
          set("missing", { href: SEARCH[code](s, film.title), title: `Not found in ${name}. Click to search ${name} for "${film.title}".` });
        }
      }

      // Radarr only shows while the film isn't in any library.
      if (libraries.some((code) => group?.[code])) {
        for (const [, set] of actionSetters || []) set.pill.remove();
        actionSetters = null;
      } else if (!actionSetters) {
        actionSetters = actions.map((code) => [code, addBadge(code)]);
        for (const [, set] of actionSetters) showRadarr(s, film, set);
      }
    });
  }

  const LANGUAGE_NAMES = new Intl.DisplayNames(["en"], { type: "language" });
  const ENGLISH = /^(?:en|eng)$/i;

  // Foreign-language films note their audio and whether English subtitles are there.
  function languageNote(details) {
    if (!details.audio || ENGLISH.test(details.audio) || /^(?:und|zxx|mul)$/i.test(details.audio)) return "";
    let language = details.audio;
    try {
      language = LANGUAGE_NAMES.of(details.audio);
    } catch {
      language = details.audio;
    }
    return `${language} audio · ${(details.subtitles || []).some((code) => ENGLISH.test(code)) ? "EN subs" : "no EN subs"}`;
  }

  function plural(count, one) {
    return `${count} ${one}${count === 1 ? "" : "s"}`;
  }

  // Owned films, shows and videos add their quality, size, languages, season and episode counts and watched state,
  // and Letterboxd pages note a watched film you haven't logged.
  async function showOwned(s, code, set, hrefFor, id, how, film = null) {
    const name = SERVER_NAMES[code];
    const title = `In ${name} (matched by ${how})`;
    const href = hrefFor(id);
    set("owned", { href, title });
    const details = s.displayDetails === "off" ? null : await SERVERS[code].details(s, id).catch(() => null);
    if (!details) return null;
    const parts = details.episodes !== undefined
      ? [plural(details.seasons || 0, "season"), plural(details.episodes || 0, "episode")]
      : [details.quality, formatSize(details.size), languageNote(details)];
    if (details.watched) parts.push("watched");
    if (details.watched && film?.slug && letterboxd.configured(s) && !(await letterboxd.logged(s, film.slug).catch(() => true))) parts.push("not logged on Letterboxd");
    const note = parts.filter(Boolean).join(" · ");
    set("owned", { href, title: `${title}${note ? `: ${note}` : ""}`, note });
    return details;
  }

  // YouTube videos match by the video ID in the library's file names.
  function runVideoPage(s, video, scan) {
    const libraries = configuredCodes(s, INDEX_SOURCES.videos);
    if (!libraries.length) return showSetup(video.anchor);

    const addBadge = createBadgeRow(video.anchor);
    const setters = libraries.map((code) => [code, addBadge(code)]);
    startMarkers(s, "videos", scan, (index, hrefs) => {
      const group = lookupGroup(index, [`youtube:${video.video}`]);
      for (const [code, set] of setters) {
        const name = SERVER_NAMES[code];
        if (index.errors[code]) {
          set("error", { title: `${name}: ${index.errors[code]}` });
        } else if (group?.[code]) {
          showOwned(s, code, set, hrefs[code], group[code], "video ID");
        } else {
          set("missing", { href: SEARCH[code](s, video.title), title: `Not found in ${name}. Click to search ${name} for "${video.title}".` });
        }
      }
    });
  }

  function radarrAddLink(s, film) {
    if (film.tmdb) return radarr.link(s, film, null);
    const term = film.imdb ? `imdb:${film.imdb}` : `${film.title} ${film.year || ""}`.trim();
    return `${s.radarrUrl}/add/new?term=${encodeURIComponent(term)}`;
  }

  function showRadarr(s, film, set, upgradeFrom = "") {
    const upgrade = upgradeFrom ? `upgrade from ${upgradeFrom}` : "";
    if (!film.tmdb) return set("action", { href: radarrAddLink(s, film), note: upgrade, title: "Open Radarr's add page" });
    set("action", { href: radarr.link(s, film, null), note: upgrade, title: "Open Radarr's add page" });
    radarr.movie(s, film).then(({ movie, state }) => {
      const note = [upgrade, state].filter(Boolean).join(" · ");
      if (note) set("action", { href: radarr.link(s, film, movie), note, title: `Radarr: ${note}. Open it to search or add the movie.` });
    }, (error) => set("error", { href: radarr.link(s, film, null), title: `Radarr: ${error.message}` }));
  }

  // Shows always link to Sonarr, since it knows which episodes are missing even when the show is in a library.
  function showSonarr(s, show, set) {
    set("action", { href: sonarr.link(s, show, null), title: "Open Sonarr's add page" });
    sonarr.series(s, show).then(({ series, state }) => {
      if (state) set("action", { href: sonarr.link(s, show, series), note: state, title: `Sonarr: ${state}. Open it to search or add the show.` });
    }, (error) => set("error", { href: sonarr.link(s, show, null), title: `Sonarr: ${error.message}` }));
  }

  // ---------------------------------------------------------------------------
  // Sites
  // ---------------------------------------------------------------------------
  function albumPage(anchor, title, artists, media = null, mbids = []) {
    if (!anchor || !title || !artists.length) return null;
    return {
      anchor,
      title,
      artists,
      mbids,
      spotifyIds: mediaIds(media, "spotify"),
      deezerIds: mediaIds(media, "deezer"),
      tidalIds: mediaIds(media, "tidal"),
    };
  }

  function parseRym() {
    const media = document.getElementById("media_link_button_container_top");
    const titleEl = document.querySelector(".album_title");
    if (!titleEl) return null;
    const title = media?.dataset.albums || titleEl.firstChild?.textContent?.trim() || "";
    const artists = media?.dataset.artists
      ? [media.dataset.artists]
      : [...document.querySelectorAll(".album_info a.artist")].map((a) => a.textContent.trim());
    return albumPage(titleEl, title, artists.filter(Boolean), media);
  }

  function parseLetterboxd() {
    const tmdb = document.body.dataset.tmdbId;
    const anchor = document.querySelector(".details h1.primaryname, .details h1");
    if (!tmdb || !anchor) return null;
    return {
      anchor,
      tmdb,
      type: document.body.dataset.tmdbType === "tv" ? "tv" : "movie",
      title: anchor.textContent.trim(),
      year: document.querySelector(".details .releasedate a")?.textContent.trim() || "",
      slug: location.pathname.match(/^\/film\/([^/]+)/)?.[1] || "",
    };
  }

  function parseBandcamp() {
    if (!location.pathname.startsWith("/album/")) return null;
    const anchor = document.querySelector("#name-section h2.trackTitle, #name-section h2");
    const og = document.querySelector('meta[property="og:title"]')?.content || "";
    const split = og.lastIndexOf(", by ");
    if (!anchor || split < 0) return null;
    return albumPage(anchor, og.slice(0, split).trim(), [og.slice(split + 5).trim()]);
  }

  // Discogs' header is a grid beside the cover, so the badges go at the top of the info block under the title.
  function parseDiscogs() {
    if (!/^\/(?:[a-z]{2}\/)?(release|master)\/\d+/.test(location.pathname)) return null;
    const heading = document.querySelector("h1");
    if (!heading) return null;
    const artists = [...heading.querySelectorAll('a[href*="/artist/"]')].map((a) => discogsName(a.textContent));
    const text = heading.textContent;
    const split = text.lastIndexOf(" – ");
    const page = albumPage(heading, (split >= 0 ? text.slice(split + 3) : text).trim(), artists);
    const info = heading.parentElement?.querySelector(':scope > [class^="info_"]');
    return page && info ? { ...page, anchor: info, position: "afterbegin" } : page;
  }

  function parseAoty() {
    if (!/^\/album\//.test(location.pathname)) return null;
    const headline = document.querySelector(".albumHeadline");
    const anchor = headline?.querySelector(".albumTitle") || document.querySelector(".albumTitle") || document.querySelector("h1");
    const artist = headline?.querySelector(".artist")?.textContent.trim() || document.querySelector("h1.artist")?.textContent.trim();
    const title = anchor?.textContent.trim();
    if (artist && title) return albumPage(anchor, title, artistVariants({ artist }));
    const og = (document.querySelector('meta[property="og:title"]')?.content || "").split(" - ");
    return og.length >= 2 ? albumPage(anchor, og[1].trim(), artistVariants({ artist: og[0].trim() })) : null;
  }

  // MusicBrainz release and release group pages match by MBID first, as tagged by Picard or beets.
  function parseMusicBrainz() {
    const match = location.pathname.match(/^\/(release|release-group)\/([0-9a-f-]{36})/);
    const header = document.querySelector(".releaseheader, .rgheader");
    const anchor = header?.querySelector("h1");
    if (!match || !anchor) return null;
    const artists = [...header.querySelectorAll('.subheader a[href*="/artist/"]')].map((a) => a.textContent.trim());
    const group = header.querySelector('.subheader a[href*="/release-group/"]')?.getAttribute("href").match(/([0-9a-f-]{36})/)?.[1];
    return albumPage(anchor, anchor.textContent.trim(), artists, null, [match[2], group].filter(Boolean));
  }

  // The Fork and The Drop have no album pages; a review opens in a dialog, which gets the badges.
  function parseFork() {
    const modal = document.querySelector(".modal-overlay.open .modal-content");
    const anchor = modal?.querySelector(".modal-title");
    const artist = modal?.querySelector(".modal-artist")?.textContent.trim();
    return anchor && artist ? albumPage(anchor, anchor.textContent.trim(), artistVariants({ artist })) : null;
  }

  function parseYoutube() {
    const video = location.pathname === "/watch" ? new URLSearchParams(location.search).get("v") : null;
    const flexy = document.querySelector("ytd-watch-flexy");
    const anchor = document.querySelector("ytd-watch-metadata #title");
    const title = anchor?.querySelector("h1")?.textContent.trim();
    if (!video || !anchor || !title || (flexy?.hasAttribute("video-id") && flexy.getAttribute("video-id") !== video)) return null;
    return { anchor, video, title };
  }

  // Sites where the page changes without a reload are watched and re-checked when the URL changes, or when the
  // page rebuilds the header the badges sit under.
  const SITES = [
    { host: /(^|\.)rateyourmusic\.com$/, kind: "music", parse: parseRym, scan: scanRym },
    { host: /(^|\.)letterboxd\.com$/, kind: "films", parse: parseLetterboxd, scan: scanLetterboxd },

    { host: /(^|\.)bandcamp\.com$/, kind: "music", parse: parseBandcamp, scan: scanBandcamp },
    { host: /(^|\.)discogs\.com$/, kind: "music", parse: parseDiscogs, scan: scanDiscogs, spa: true },
    { host: /(^|\.)albumoftheyear\.org$/, kind: "music", parse: parseAoty, scan: scanAoty },
    { host: /(^|\.)musicbrainz\.org$/, kind: "music", parse: parseMusicBrainz, scan: scanMusicBrainz },
    { host: /^the-(?:fork|drop-reviews)\.vercel\.app$/, kind: "music", parse: parseFork, scan: scanFork, spa: true },
    { host: /^www\.youtube\.com$/, kind: "videos", parse: parseYoutube, scan: scanYoutube, spa: true },
  ];
  const PAGE_RUNNERS = { music: runAlbumPage, films: runFilmPage, videos: runVideoPage };

  let scanStarted = false;

  function runSite(s, site) {
    const page = site.parse();
    if (page) {
      PAGE_RUNNERS[site.kind](s, page, site.scan);
      if (site.scan) scanStarted = true;
    } else if (site.scan && !scanStarted) {
      scanStarted = true;
      startMarkers(s, site.kind, site.scan);
    }
    return !!page;
  }

  function watchSpa(s, site) {
    let url = location.href;
    let done = runSite(s, site);
    let timer = null;
    new MutationObserver(() => {
      if (timer || document.hidden) return;
      timer = setTimeout(() => {
        timer = null;
        if (location.href !== url) {
          url = location.href;
          document.getElementById("library-badges")?.remove();
          done = false;
        } else if (done && !document.getElementById("library-badges")) {
          done = false;
        }
        if (!done) done = runSite(s, site);
      }, 300);
    }).observe(document.body, { childList: true, subtree: true });
  }

  // Copies every setting (including passwords and tokens) to the clipboard, or reads them back, to set up another browser.
  async function exportSettings() {
    const text = JSON.stringify(getSettings());
    try {
      await navigator.clipboard.writeText(text);
      alert("Library Badges settings copied to the clipboard. They include your passwords and tokens.");
    } catch {
      prompt("Copy your Library Badges settings (they include your passwords and tokens):", text);
    }
  }

  function importSettings() {
    const text = prompt("Paste exported Library Badges settings:");
    if (!text) return;
    try {
      const values = normalizeSettings(JSON.parse(text));
      for (const key of SETTING_KEYS) GM_setValue(key, values[key]);
      location.reload();
    } catch {
      alert("Those aren't Library Badges settings.");
    }
  }

  GM_registerMenuCommand("Settings", openSettings);
  GM_registerMenuCommand("Refresh library index", clearIndexes);
  GM_registerMenuCommand("Export settings", exportSettings);
  GM_registerMenuCommand("Import settings", importSettings);
  if (document.getElementById("library-badges")) return;
  const settings = getSettings();
  const site = SITES.find((entry) => entry.host.test(location.hostname));
  if (site?.spa) watchSpa(settings, site);
  else if (site) runSite(settings, site);
})();
