# Security

inspo runs a local server, drives your browser and saves files in your project. If you find a
way to make it read, write or run something it shouldn't, report it privately.

## Reporting a vulnerability

**Don't open a public issue.** Use **[Report a vulnerability](https://github.com/brunovareliuu/inspo/security/advisories/new)**
on the repo's **Security** tab. Include:

- what can be done and what it takes (a malicious site being crawled? a crafted session file?);
- the steps to reproduce it;
- the version or commit.

You'll get an answer once it's reviewed. If it's real, it gets fixed on `main`, a release goes
out, and you're credited in the advisory if you want.

## Supported versions

Only the latest release and `main`. Update the plugin (`/plugin update inspo`) to get fixes.

## Already covered

- The board server listens on `localhost` only.
- Attachments on page comments only accept files inside the session's `assets/` folder; paths
  like `../` or `/etc/passwd` are dropped (there's a unit test for it).
- Crawled sites run in a separate browser context; the Mobbin login lives in its own profile
  under `~/.inspo`.

Out of scope: the terms of the galleries and sites you research, and anything a site does
inside your own browser session while inspo visits it.
