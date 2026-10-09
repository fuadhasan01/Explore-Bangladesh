# Explore Bangladesh 🇧🇩

**Every District Has a Story. How Many Have You Explored?**

Explore Bangladesh is an interactive travel tracker built with **Angular**, **TypeScript**, **D3.js**, and **GeoJSON**. Mark the districts you've visited, explore your progress across Bangladesh's eight divisions, and export your journey as a personalized travel poster.

> **Live website:** Add your deployed URL here  
> **Repository:** Add your GitHub repository URL here

<!-- Add screenshots after verifying the production UI. -->
<!-- Example: ![Explore Bangladesh homepage](docs/screenshots/homepage.png) -->

## Features

- **Interactive Bangladesh map:** Explore the country's 64 districts with real GeoJSON district boundaries, hover details, zoom, and pan.
- **District tracker:** Mark or unmark districts directly on the map or through the District Explorer.
- **Search and filters:** Search by district name and filter by division or visited status; select or clear filtered results.
- **Travel insights:** View visited and remaining districts, overall completion percentage, and progress across all eight divisions.
- **Automatic saving:** Restore visited districts after a refresh using browser `localStorage`.
- **Downloadable travel posters:** Customize the title, colors, legend, statistics, and branding; export PNG or SVG.
- **Theme preferences:** Light and dark modes with a locally saved preference.
- **Responsive experience:** Designed for desktop and mobile, with keyboard-accessible district selection through the explorer.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Angular, TypeScript, standalone components |
| State management | Angular Signals |
| Mapping | D3.js, SVG, GeoJSON |
| Styling | Tailwind CSS, custom CSS |
| Icons | Lucide Angular |
| Persistence | Browser localStorage |
| Image export | html-to-image, SVG |
| Unit testing | Vitest, Angular TestBed |
| Browser testing | Playwright |
| Deployment | Vercel or Netlify |

## Getting Started

### Prerequisites

- Node.js and npm versions compatible with the project's Angular version
- Git (optional, for cloning)

### Install and run

```bash
git clone https://github.com/YOUR_USERNAME/explore-bangladesh.git
cd explore-bangladesh
npm ci
npm start
```

Open **http://localhost:4200**.

If you already have the project locally, open its folder and run `npm ci` followed by `npm start`.

### Production build

```bash
npm run build
```

The exact output folder depends on `angular.json`. For a typical Angular application-builder setup, the static browser files are in `dist/explore-bangladesh/browser/`.

### Testing

```bash
# Unit tests
npx ng test --watch=false

# End-to-end tests (if the Playwright tests are configured)
npx playwright test

# Unit-test coverage (if coverage support is installed)
npx ng test --watch=false --coverage
```

## Project Structure

```text
public/
  assets/
    geojson/
      bangladesh-districts.geojson
src/
  app/
    core/
      constants/
      models/
      services/
        district-geojson.service.ts
        travel-state.service.ts
        theme.service.ts
      utils/
        map-geometry.util.ts
    features/
      travel-map/
        components/
          bangladesh-map/
          district-explorer/
          division-progress/
          map-export/
    app.ts
    app.html
    app.css
  styles.css
```

> Structure reflects the implementation roadmap; adjust it to match the files present in your repository.

## How It Works

1. `DistrictGeoJsonService` loads district boundary data and validates district identifiers and division counts.
2. D3.js converts district geometries into individual SVG paths for the interactive map.
3. `TravelStateService` stores selected district identifiers in Angular Signals and calculates progress.
4. The map, District Explorer, and division dashboard share this state, so changes stay synchronized.
5. Selected IDs are saved in browser `localStorage` and restored after the GeoJSON dataset loads.
6. The export component creates a standalone travel-poster SVG and generates a PNG when requested.

### Data and privacy

Travel selections are stored **locally in the visitor's browser**. This version does not require an account or a backend to store travel progress. Browser storage may be cleared by the user or browser, and progress is not automatically shared between devices.

## Deployment

This is a client-side Angular application that can be hosted on platforms such as Vercel or Netlify.

1. Run the production build and tests.
2. Verify that the `bangladesh-districts.geojson` file is present in the deployable output.
3. Import the GitHub repository into the hosting platform.
4. Use `npm run build` as the build command, and confirm the output directory from `angular.json`.
5. Configure single-page-app route rewrites **if** actual client-side routes require them.
6. Set the production domain in `src/index.html`, `public/robots.txt`, and `public/sitemap.xml`.
7. Test the live map, search, saved progress, theme, and downloads on desktop and mobile.

## Geographic Data Attribution and License

The map uses GeoJSON boundaries for Bangladesh's 64 districts. **Before publishing**, complete and verify the following information:

- **Boundary dataset:** Add the exact source repository or download URL.
- **Original data provider:** Add the underlying geographic data publisher.
- **Reference date/version:** Add the dataset's administrative boundary date.
- **License:** Confirm redistribution and modification rights for both the original and simplified data.
- **Required attribution:** Add the wording and links required by that license.

Simplification or polygon-winding correction does not remove any licensing or attribution obligations. Do not publish a dataset whose redistribution rights have not been confirmed.

## Known Limitations

- Visited districts are saved per browser/device, not synchronized between accounts or devices.
- District-boundary accuracy depends on the chosen source dataset and its reference date.
- Poster image export depends on browser support for SVG rendering and file downloads.

## Future Improvements

- Optional user accounts and cloud synchronization
- District travel guides and notable places
- Shareable links for travel progress
- Travel achievements and milestones
- English and Bangla localization

## Contributing

Issues and pull requests are welcome after the repository is made public. Please describe the problem or change clearly and include reproduction steps for bugs.

## License

**Application source-code license:** To be selected by the maintainer.  
**Geographic data license:** Must be documented separately in the attribution section above.

---

Made for travelers who want to remember every district they explore. 🇧🇩
