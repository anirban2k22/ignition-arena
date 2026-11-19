# Ignition Arena

Live engagement app for the UTL Ignition Challenge RoboWar fights. VIPs bet virtual coins (Sparks) on teams from a tablet, the audience cheers from their phones, and the admin runs everything and controls the LED wall. No real money is involved.

## Run it

You need Node.js 18 or newer.

```bash
cd ignition-arena
npm install
npm start
```

The terminal prints the links. Default admin PIN is `2026`. To change the PIN or port:

```bash
ADMIN_PIN=4321 PORT=8080 npm start
```

`npm run reset` reloads the demo data.

## The four panels

| Panel | URL | Who uses it |
| --- | --- | --- |
| Admin | `/admin` | Organisers. Matches, teams, VIPs, results, LED wall control and a live LED preview |
| LED wall | `/led` | The laptop plugged into the LED. Open it in full screen (press F11 or Ctrl+Cmd+F on a Mac) |
| VIP lounge | `/vip?t=<token>` | One tablet per VIP. Each VIP has a private link in Admin > VIPs (Copy, QR or Open) |
| Audience | `/cheer` | Everyone else. They scan the QR on the LED wall, enter a name, pick a team and tap Cheer |

## How a match runs

1. **Admin > Live control**: pick the live match. It appears on every VIP tablet, audience phone and the LED wall.
2. Put **Face-off** on the LED wall to introduce the two teams.
3. Press **Open betting**. VIPs back Red or Blue with any amount from their wallet. Switch the LED to **VIP bets**.
4. Press **Lock betting** when the fight starts. Switch the LED to **Cheer meter** to get the crowd tapping.
5. Press **Team X wins**. Coins are paid out and the LED moves to the **Winner** card.
6. Between fights, use **VIP leaderboard**, **Top fans**, **Team lineup** or **Message**.

## Betting rules

- Every VIP starts with the same balance (default 10,000 Sparks, set in Settings).
- A VIP can back only one side per match, but can add more to that side while betting is open.
- Winners share the losing side's pool in proportion to their stake (a pari-mutuel pool). A VIP who bets 1,000 on the winner gets their 1,000 back plus their share of the losing pool.
- **Undo result** reverses a payout. **Cancel match and refund bets** returns every stake.
- With about 20 VIPs and 15 teams there is no fixed VIP-to-team pairing. Any VIP can bet on any match.

## Cheering

- Each tap on Cheer is 1 point, capped at about 12 taps a second per phone.
- Fans can cheer for either team in the live fight. Their own team is marked.
- The top fan of each side shows on the VIP bets screen. The top 5 per side show on the Cheer meter screen.

## Phones and tablets need to reach the laptop

Phones open the address in the QR code. By default that is this laptop's Wi-Fi address, for example `http://192.168.1.20:3000`. This works only if the phones are on the same Wi-Fi as the laptop and the network allows device-to-device traffic. Many college and guest networks block that.

For the real event, the safer options are:

- a dedicated router or hotspot that the laptop, VIP tablets and audience join, or
- hosting the app online (Render, Railway, a small VPS) and setting the **Public address** in Settings so the QR points there.

## Before the event

1. Replace the dummy teams in **Teams** (name, bot name, photo, short description). Without a photo, a generated bot illustration is used.
2. Replace the dummy VIPs in **VIPs** and open each VIP's link once on their tablet.
3. Build the fight card in **Matches**.
4. **Settings > Clear bets, cheers and results** to remove the demo activity. Teams, VIPs and matches stay.

## Files

- `server.js`: the server, game logic and real-time updates (Socket.IO)
- `data/seed.js`: dummy teams, VIPs and matches
- `data/state.json`: live data, saved automatically (created on first change)
- `public/`: the four panels (`admin`, `led`, `vip`, `cheer`), shared styles and fonts
- `public/uploads/`: team photos uploaded from Admin
