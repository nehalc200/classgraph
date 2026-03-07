# ClassGraph
Discover course prerequisites for classes at UCSD. We deploy scrapers to collect up-to-date information, allowing the visualization of complex logical course hierarchies.

## Key Features
- Class Search: Search classes by code, with support for multiple formats
- Information Highlighting: Highlight nodes with the (!) icon to view additional requirement that may be need to be fulfilled.
- Visualization: Visualize the course tree as a graph, grouped by logical pairings, and expand down the entire prerequisite tree.

## Architecture
```
UCSD Course Catalog + Schedule of Classes Scraper (Automated)
    |
Course Tooling (Merge Datasets and verify prerequisites)
    |
Tree Generation (Generate complete trees for each class)
    |
Frontend UI (Select class/Upload P.D.F, visualize class flow)
```

## Preparation and Deployment
### Pre-requisites
- Python 3.12+
- Go 1.23+
- NPM
### Deployment
```
# clone repository
git clone https://github.com/nehalc200/classgraph.git

# install python requirements
pip install -r requirements.txt

# scrape course catalog
python catalog_scraper/main.py

# scrape schedule of classes
cd soc_scraper
go build
./soc_scraper
cd ..

# cross-verify classes and build trees
python data/helpers/cross_check.py
python data/helpers/ast.p

# install NPM dependencies
npm install
npm run build
```
## Project Structure
```
classgraph/
├── .github/
│   └── workflows/          # GitHub Actions CI/CD workflows
├── catalog_scraper/        # Scraper for course catalog data 
├── data/                   # Directory for storing the scraped data output 
├── major_scraper/          # Scraper for major-specific data
├── soc_scraper/            # Scraper for the Schedule of Classes (SOC)
├── src/                    # Frontend source code for the web application
├── .gitignore              # Git untracked files configuration
├── README.md               # Project documentation
├── index.html              # Main HTML entry point for the web app
├── package-lock.json       # Exact versions of npm dependencies
├── package.json            # Node.js dependencies and project scripts
├── requirements.txt        # Python dependencies for the scrapers
├── tailwind.config.js      # Tailwind CSS configuration
├── tailwind.css            # Main stylesheet for Tailwind
└── vite.config.js          # Vite build tool configuration
```
### Tech Stack
| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Interface** | JavaScript, HTML | Core logic and structure for the web application. |
| **Styling** | Tailwind CSS | Utility-first CSS framework for rapidly styling the user interface. |
| **Frontend Build Tool**| Vite | Fast build tool and local development server for compiling frontend assets. |
| **S.O.C Scraping** | Go | Async-enabled web-scraping from live UCSD data feeds |
| **Catalog Scraping** | Python | Fast and modular scraping from static UCSD data |
| **Data Processing** | Python | Supplemental scripts for data extraction and processing. |
| **Data Storage** | JSON | The primary format for organizing and storing the scraped data. |
| **Package Management** | npm, pip | Dependency management for the JavaScript frontend and Python scrapers. |
| **CI/CD** | GitHub Actions | Automated workflows for continuous integration and updating scraped data. |
| **Deployment** | Vercel | Hosting platform for the live web application. |

## Testing
```bash
# Run all tests
cd soc_scraper
go test ./... -v
```