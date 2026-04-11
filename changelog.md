## [2.0.0] – Apr 2026

### 🚀 Major Release – Data System Overhaul

### Added
- Unified location identity system using deterministic ID generation (name + lat/lng)
- Seamless merging of static dataset (19k+ locations) with real-time Firebase data
- Real-time vote synchronization across Map and List views
- Scalable voting architecture supporting large datasets without performance degradation
- Consistent speed rating system (5-star) across all components

### Changed
- Refactored data loading pipeline to support hybrid static + dynamic sources
- Standardized vote schema (`upvotes`, `downvotes`, `speedTotal`, `speedVotes`)
- Rebuilt map rendering pipeline for consistency with index view
- Improved marker rendering and popup interaction behavior
- Aligned UI behavior between map and list views (votes + ratings)

### Fixed
- Resolved vote desync between map and index views
- Fixed ID mismatches causing missing or incorrect vote data
- Fixed speed rating inconsistencies (`speedCount` → `speedVotes`)
- Fixed hover/popup interaction issues on map markers

### Performance
- Optimized handling of large datasets (19k+ locations)
- Reduced redundant computations during render cycles
- Improved real-time update efficiency via Firestore listeners

### Developer Experience
- Cleaner separation between static data, Firebase data, and UI logic
- Improved maintainability of location and vote systems
- Established foundation for future features (moderation, ranking, analytics)

### Misc
- This is the update where Stir My Coffee stops being a project… and becomes a platform ☕🔥


## [1.6.0] – Apr 2026

### Added
- New About page hero section featuring founder illustration and core product message
- Featured spotlight section highlighting QCC Student of the Month recognition
- Dedicated `about.css` for modular styling

### Changed
- Complete About page redesign with card-based layout
- Improved visual hierarchy and spacing
- Moved credibility and key messaging above the fold
- Better integration of founder story with product narrative

### UX
- Reduced wall-of-text feel with scannable sections
- Improved engagement and readability
- Stronger first impression and onboarding experience

### Misc
- The About page finally feels like a product, not a document ☕🔥

## [1.5.1] – Apr 2026

### Changed
- Moved Top Picks section to top on mobile for improved visibility and engagement
- Reworded Top Picks header for stronger clarity and product alignment
- Added “Vote Here” section header to guide user interaction
- Added voting subtext (“Once per shop per day”) to improve transparency and reduce confusion
- Improved visual hierarchy by matching header styles (font size, weight, color)
- Refined spacing and alignment for tighter, more intentional UI

### UX
- Increased clarity of core user actions (voting + discovery)
- Reduced friction and confusion around voting limitations
- Improved mobile-first experience by prioritizing high-value content

### Misc
- The app is starting to feel *really* dialed in ☕🔥

## [1.5.0] – Apr 2026

### Fixed
- Resolved mobile layout overflow causing UI elements to extend off-screen
- Fixed Top Picks panel duplicate entries when dataset is small
- Restored Top Picks panel border and visual styling
- Fixed inconsistent cursor behavior across interactive elements (cards, buttons, icons)
- Fixed social media icons (Facebook, Instagram) being overridden by theme styles
- Fixed star rating hover interaction (visual feedback + scaling)
- Fixed directions icon hover and pointer behavior

### Changed
- Refactored and consolidated CSS to remove duplicate and conflicting rules
- Improved interaction feedback across voting, rating, and navigation elements
- Enhanced UI consistency across desktop and mobile
- Improved Top Picks selection logic with better distribution across categories

### Technical
- Reduced CSS conflicts by centralizing card and interaction styles
- Improved selector specificity to prevent theme overrides from breaking core UI
- Cleaned up redundant styling rules for maintainability
- Strengthened UI behavior under edge cases and mixed data conditions

### Misc
- The app now feels way more responsive and intentional 😎

## [1.4.0] – Apr 2026

### Added
- Dynamic seasonal theme system (Winter, Spring, Summer, Fall)
- Holiday-based themes (Easter, Christmas, Halloween, July 4, Veterans Day, Memorial Day, Thanksgiving, Valentines Day, St. Patricks Day, Black History Month)
- Automatic theme switching based on date
- Cross-page theme support (About, Legal, Changelog now match main app)
- Smooth theme transition effect with fade animation

### Changed
- Spring and Easter themes redesigned with cleaner pastel palette (blue/yellow focus)
- Improved visual consistency across all pages
- Enhanced seasonal UI clarity and identity

### Technical
- Extracted theme system into dedicated `theme.js` module
- Removed duplicate theme logic from `app.js`
- Implemented safe CSS loading with fallback handling
- Fixed theme loading across secondary pages
- Improved script loading order for reliability

### Misc
- The site now changes with the seasons 🌸🎃🎄

## [1.3.1] – Apr 2026

### Added
- Facebook social link in footer with hover styling
- Improved "Locate Me" button feedback states (loading, success, failure)
- Accessibility enhancements (ARIA labels, keyboard navigation improvements)
- Changelog page included in sitemap for better indexing

### Changed
- Standardized layout and spacing across About and Legal pages using shared content-page system
- Major layout improvements with fixed header/footer and scrollable content area
- Increased max-width to 1350px for improved readability and layout balance
- Refined responsive grid system for better desktop and mobile experience
- Improved "Locate Me" UX to better communicate functionality
- Footer layout enhancements with improved spacing and social icon presentation

### Technical
- Removed all console.log debug statements (production cleanup)
- General codebase cleanup and performance improvements
- Improved HTML structure and removed unused DOM elements
- Added external link security attributes (noopener noreferrer)
- Hardened Firestore security rules to prevent abuse
- Improved sitemap structure and scalability for SEO growth

### Misc
- Something wanders…

## [1.2.1] - Mar 31, 2026

### Added
- Open Graph (OG) meta tag optimization for improved social sharing previews
- Stronger Facebook/Twitter link previews to increase click-through rate

### Changed
- Updated page title and metadata to better target "coffee near me" search intent
- Improved social messaging to emphasize problem-solution positioning
- Linked version number in footer to changelog for easier transparency

### Technical
- Verified Google Analytics integration and live user tracking
- Cleaned up duplicate meta tags for consistency

### Changed
- Improved location clarity for duplicate stores
- Cleaner UI for faster decision-making

### Removed
- Duplicate distance display in location cards

## [1.2.0] - Mar 28, 2026
### Added
- Progressive Web App (PWA) support with install capability
- "Get the App" install button integrated into main UI
- Service worker for app installability and performance groundwork
- Web app manifest for mobile app experience

### Changed
- Unified button styling for consistent UI/UX
- Improved user onboarding flow with app install prompt

### Technical
- Integrated Capacitor for Android app deployment
- Initialized native Android project for future Play Store release

## [1.1.1] - Mar 28, 2026
### Added
- Google Analytics integration for real user tracking


