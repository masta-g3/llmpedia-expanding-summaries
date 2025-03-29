# LLMpedia Expandable Summaries

A lightweight, modern web interface for exploring research paper summaries at adjustable levels of detail. This application allows users to select academic papers and view their summaries at different levels of conciseness, with smooth transitions between levels.

![LLMpedia Interface](https://i.imgur.com/placeholder.png) <!-- Replace with actual screenshot when available -->

## Features

- **Interactive Summary Control**: Adjust summary length using a slider, with real-time expansion/contraction
- **Visual Highlighting**: New content is temporarily highlighted when expanding summaries
- **Paper Browsing**: View papers in either dropdown or list format
- **Search Functionality**: Search papers by title or author
- **Influential Citation Indicators**: Papers with influential citations are marked with a star
- **Markdown & LaTeX Support**: Full rendering of formatted text and mathematical equations
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Minimal Dependencies**: Lightweight implementation with only essential libraries

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Rendering**: Marked.js for Markdown, KaTeX for LaTeX equations

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/llmpedia-expanding-summaries.git
   cd llmpedia-expanding-summaries
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your database credentials:
   ```
   PORT=3000
   DB_NAME=your_db_name
   DB_USER=your_db_user
   DB_PASS=your_db_password
   DB_HOST=your_db_host
   DB_PORT=your_db_port
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. For development with auto-reload:
   ```bash
   npm run dev
   ```

## Database Schema

The application requires the following PostgreSQL tables:

- **arxiv_details**: Contains basic information about papers
  - `arxiv_code`: Unique identifier (e.g., "2106.01054")
  - `title`: Paper title
  - `authors`: Paper authors
  - `published`: Publication date
  - `summary`: Abstract
  - `arxiv_comment`: Additional information

- **semantic_details**: Contains citation information
  - `arxiv_code`: Unique identifier matching arxiv_details
  - `citation_count`: Number of citations
  - `influential_citation_count`: Number of influential citations
  - `venue`: Publication venue
  - `tldr`: Very short summary

- **summary_notes**: Contains summaries at different levels
  - `arxiv_code`: Unique identifier matching arxiv_details
  - `level`: Detail level (1=shortest, 7=longest)
  - `method`: Method used to generate summary (filter for "full_text")
  - `summary`: The actual summary content with `<original>` and `<new>` tags

## Usage

1. Open the application in your browser at `http://localhost:3000`
2. Use the dropdown or list view to select a paper
3. Adjust the slider to change the level of detail in the summary
4. Use the search box to find papers by title or author
5. Click the theme toggle button to switch between light and dark modes

## Development

- The application uses vanilla JavaScript to minimize dependencies
- CSS variables provide consistent theming across light and dark modes
- All API endpoints are prefixed with `/api/` for easy identification
- Client-side caching minimizes database calls

## License

[MIT License](LICENSE)

## Contributors

- Your Name - Initial work

## Acknowledgments

- Inspired by arXiv's color scheme and design philosophy
- Built to provide an enhanced reading experience for research papers