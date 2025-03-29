// Cache for storing fetched summaries to minimize DB calls
const summaryCache = {};

// Based on the summary_notes table 'level' values
const paragraphLengths = [1, 2, 3, 5, 10, 20, 30];

// Store all papers data for client-side filtering
let allPapers = [];

// DOM elements
const paperSelector = document.getElementById('paper-selector');
const detailSlider = document.getElementById('detail-slider');
const paragraphCount = document.getElementById('paragraph-count');
const summaryContent = document.getElementById('summary-content');
const paperTitle = document.getElementById('paper-title');
const paperAuthors = document.getElementById('paper-authors');
const paperDate = document.getElementById('paper-date');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Fetch papers from database
    fetchPapers();
    
    // Set up event listeners
    paperSelector.addEventListener('change', handlePaperSelection);
    detailSlider.addEventListener('input', handleSliderChange);
    
    // Set up search and browse features
    initPaperBrowser();
    
    // Enable tooltip or keyboard navigation enhancement
    enhanceAccessibility();
    
    // Initialize dark mode toggle
    initThemeToggle();
});

/**
 * Initialize the paper browsing and search functionality
 */
function initPaperBrowser() {
    const paperSearch = document.getElementById('paper-search');
    const papersList = document.getElementById('papers-list');
    const browseBtn = document.getElementById('browse-papers');
    const dropdownViewBtn = document.getElementById('dropdown-view');
    const listViewBtn = document.getElementById('list-view');
    
    // Search functionality
    paperSearch.addEventListener('input', () => {
        const searchTerm = paperSearch.value.toLowerCase().trim();
        
        if (papersList.classList.contains('active')) {
            // Filter list view
            filterPapersList(searchTerm);
        } else {
            // Filter dropdown
            filterPapersDropdown(searchTerm);
        }
    });
    
    // Browse button toggles list view
    browseBtn.addEventListener('click', () => {
        papersList.classList.toggle('active');
        if (papersList.classList.contains('active')) {
            renderPapersList();
            listViewBtn.classList.add('active');
            dropdownViewBtn.classList.remove('active');
        }
    });
    
    // View toggle buttons
    dropdownViewBtn.addEventListener('click', () => {
        if (!dropdownViewBtn.classList.contains('active')) {
            dropdownViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            papersList.classList.remove('active');
        }
    });
    
    listViewBtn.addEventListener('click', () => {
        if (!listViewBtn.classList.contains('active')) {
            listViewBtn.classList.add('active');
            dropdownViewBtn.classList.remove('active');
            papersList.classList.add('active');
            renderPapersList();
        }
    });
}

/**
 * Enhance accessibility with keyboard navigation and ARIA attributes
 */
function enhanceAccessibility() {
    // Add ARIA attributes to the slider
    detailSlider.setAttribute('aria-label', 'Summary detail level');
    detailSlider.setAttribute('aria-valuemin', '1');
    detailSlider.setAttribute('aria-valuemax', '7');
    detailSlider.setAttribute('aria-valuenow', '1');
    
    // Update ARIA value on slider change
    detailSlider.addEventListener('change', function() {
        this.setAttribute('aria-valuenow', this.value);
    });
    
    // Make paper selector more accessible
    paperSelector.setAttribute('aria-label', 'Select a research paper');
}

/**
 * Fetch available papers from the database
 */
async function fetchPapers() {
    try {
        showLoading(summaryContent, 'Loading papers');
        
        // Fetch papers from the database with a batch request for citation details
        const [papersResponse, citationsResponse] = await Promise.all([
            fetch('/api/papers'),
            fetch('/api/citations') // New endpoint we'll create for citation info
        ]);
        
        if (!papersResponse.ok) throw new Error(`HTTP error ${papersResponse.status}`);
        
        const papers = await papersResponse.json();
        
        // If citations endpoint responded successfully, add citation data to papers
        if (citationsResponse && citationsResponse.ok) {
            const citations = await citationsResponse.json();
            
            // Create a map for quick lookup
            const citationMap = new Map();
            citations.forEach(citation => {
                citationMap.set(citation.arxiv_code, {
                    citationCount: citation.citation_count,
                    influentialCount: citation.influential_citation_count
                });
            });
            
            // Add citation data to papers
            papers.forEach(paper => {
                const citationData = citationMap.get(paper.arxiv_id);
                if (citationData) {
                    paper.citation_count = citationData.citationCount;
                    paper.influential_citation_count = citationData.influentialCount;
                    paper.has_influential = citationData.influentialCount > 0;
                }
            });
        }
        
        // Store papers for filtering
        allPapers = papers.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));
        
        // Populate paper selector
        populateDropdown(allPapers);
        
        hideLoading();
        
        if (papers.length > 0) {
            summaryContent.innerHTML = '<div class="summary-text"><p>Select a paper to view its summary</p></div>';
        } else {
            summaryContent.innerHTML = '<div class="summary-text"><p>No papers available</p></div>';
        }
    } catch (error) {
        console.error('Error fetching papers:', error);
        displayError('Failed to load papers. Please try again later.');
    }
}

/**
 * Populate the dropdown with papers
 * @param {Array} papers - Array of paper objects
 */
function populateDropdown(papers) {
    // Clear existing options except the placeholder
    while (paperSelector.options.length > 1) {
        paperSelector.remove(1);
    }
    
    // Add papers to dropdown
    papers.forEach(paper => {
        const option = document.createElement('option');
        option.value = paper.arxiv_id;
        option.textContent = paper.title;
        
        // Add class for influential papers to enable styling
        if (paper.has_influential) {
            option.classList.add('influential');
        }
        
        paperSelector.appendChild(option);
    });
}

/**
 * Render the papers list view
 * @param {string} searchTerm - Optional search term to filter papers
 */
function renderPapersList(searchTerm = '') {
    const papersList = document.getElementById('papers-list');
    papersList.innerHTML = '';
    
    const filteredPapers = searchTerm ? 
        allPapers.filter(paper => 
            paper.title.toLowerCase().includes(searchTerm) || 
            paper.authors.toLowerCase().includes(searchTerm)
        ) : 
        allPapers;
    
    if (filteredPapers.length === 0) {
        papersList.innerHTML = '<div class="empty-results">No papers match your search</div>';
        return;
    }
    
    filteredPapers.forEach(paper => {
        const paperItem = document.createElement('div');
        paperItem.className = 'paper-item';
        paperItem.dataset.paperId = paper.arxiv_id;
        
        // Format date
        const publishDate = new Date(paper.published_date);
        const dateStr = publishDate.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Create star icon for influential papers
        const starIcon = paper.has_influential ? 
            `<div class="star-icon" title="Has influential citations">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
            </div>` : '';
        
        paperItem.innerHTML = `
            <h3>${paper.title}</h3>
            <div class="paper-item-meta">
                <div class="paper-item-info">
                    ${starIcon}
                    <div class="paper-item-authors">${paper.authors}</div>
                </div>
                <div class="paper-item-date">${dateStr}</div>
            </div>
        `;
        
        paperItem.addEventListener('click', () => {
            // Select this paper
            paperSelector.value = paper.arxiv_id;
            handlePaperSelection();
            
            // Switch to dropdown view
            document.getElementById('dropdown-view').click();
        });
        
        papersList.appendChild(paperItem);
    });
}

/**
 * Filter the papers list based on search term
 * @param {string} searchTerm - The search term
 */
function filterPapersList(searchTerm) {
    renderPapersList(searchTerm);
}

/**
 * Filter the dropdown options based on search term
 * @param {string} searchTerm - The search term
 */
function filterPapersDropdown(searchTerm) {
    if (searchTerm === '') {
        populateDropdown(allPapers);
        return;
    }
    
    const filteredPapers = allPapers.filter(paper => 
        paper.title.toLowerCase().includes(searchTerm) || 
        paper.authors.toLowerCase().includes(searchTerm)
    );
    
    populateDropdown(filteredPapers);
}

/**
 * Display loading indicator
 * @param {HTMLElement} element - Element to show loading in
 * @param {string} message - Loading message
 */
function showLoading(element, message = 'Loading') {
    element.innerHTML = `
        <div class="loading">
            <div class="loading-text">${message}</div>
        </div>
    `;
}

/**
 * Hide any loading indicators
 */
function hideLoading() {
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => el.remove());
}

/**
 * Display error message
 * @param {string} message - Error message to display
 */
function displayError(message) {
    summaryContent.innerHTML = `<div class="summary-text"><p class="error">${message}</p></div>`;
}

/**
 * Handle paper selection change
 * @param {Event} event - Optional event object
 * @param {string} forcePaperId - Optional paper ID to force selection
 */
async function handlePaperSelection() {
    const paperId = paperSelector.value;
    
    if (!paperId) return;
    
    try {
        // Show loading state
        showLoading(summaryContent, 'Loading paper summary');
        clearPaperDetails();
        
        // Reset slider to lowest detail level
        detailSlider.value = 1;
        detailSlider.setAttribute('aria-valuenow', '1');
        paragraphCount.textContent = paragraphLengths[0];
        
        // Fetch paper details
        const paperResponse = await fetch(`/api/paper/${paperId}`);
        if (!paperResponse.ok) throw new Error(`HTTP error ${paperResponse.status}`);
        
        const paperDetails = await paperResponse.json();
        
        // Update paper metadata
        updatePaperDetails(paperDetails);
        
        // Fetch the summary at the current detail level
        await fetchAndRenderSummary(paperId, paragraphLengths[0]);
        
        // Hide papers list if visible
        document.getElementById('papers-list').classList.remove('active');
        document.getElementById('dropdown-view').classList.add('active');
        document.getElementById('list-view').classList.remove('active');
    } catch (error) {
        console.error('Error loading paper:', error);
        displayError('Failed to load paper. Please try again later.');
    }
}

/**
 * Clear paper details from UI
 */
function clearPaperDetails() {
    paperTitle.textContent = '';
    paperAuthors.textContent = '';
    paperDate.textContent = '';
    document.getElementById('paper-venue').textContent = '';
    document.getElementById('paper-citations').textContent = '';
    document.getElementById('influential-citations').textContent = '';
    document.getElementById('paper-venue').style.display = 'none';
    document.getElementById('paper-citations').style.display = 'none';
    document.getElementById('influential-citations').style.display = 'none';
    document.querySelector('.paper-citation-container').style.display = 'none';
}

/**
 * Update paper details in the UI
 * @param {Object} paperDetails - Paper metadata
 */
function updatePaperDetails(paperDetails) {
    paperTitle.textContent = paperDetails.title;
    paperAuthors.textContent = paperDetails.authors;
    
    // Format date nicely
    const publishDate = new Date(paperDetails.published_date);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    paperDate.textContent = publishDate.toLocaleDateString(undefined, options);
    
    // Update venue if available
    const venueElement = document.getElementById('paper-venue');
    if (paperDetails.venue) {
        venueElement.textContent = `Published in: ${paperDetails.venue}`;
        venueElement.style.display = 'inline-block';
    } else {
        venueElement.style.display = 'none';
    }
    
    // Update citation info if available
    const citationContainer = document.querySelector('.paper-citation-container');
    const citationsElement = document.getElementById('paper-citations');
    const influentialCitationsElement = document.getElementById('influential-citations');
    
    console.log('Updating citation display with:', {
        citation_count: paperDetails.citation_count,
        influential_citation_count: paperDetails.influential_citation_count
    });
    
    // Check if citation data exists (including 0 values)
    const hasCitationData = paperDetails.citation_count !== undefined && paperDetails.citation_count !== null;
    
    if (hasCitationData) {
        // Show the container
        citationContainer.style.display = 'flex';
        
        // Always show regular citations (even if 0)
        const citationCount = parseInt(paperDetails.citation_count) || 0;
        citationsElement.textContent = `${citationCount} ${citationCount === 1 ? 'citation' : 'citations'}`;
        citationsElement.style.display = 'flex';
        
        // Influential citations - only show if value exists and is not 0
        const influentialCount = parseInt(paperDetails.influential_citation_count) || 0;
        if (influentialCount > 0) {
            influentialCitationsElement.textContent = `${influentialCount} influential ${influentialCount === 1 ? 'citation' : 'citations'}`;
            influentialCitationsElement.style.display = 'flex';
        } else {
            influentialCitationsElement.style.display = 'none';
        }
    } else {
        // No citation data available
        console.log('No citation data available for display');
        citationContainer.style.display = 'none';
    }
}

/**
 * Handle slider change
 */
async function handleSliderChange() {
    const sliderValue = parseInt(detailSlider.value);
    const paragraphLength = paragraphLengths[sliderValue - 1];
    const paperId = paperSelector.value;
    
    if (!paperId) return;
    
    // Update paragraph count display
    paragraphCount.textContent = paragraphLength;
    
    // Fetch and render summary at the selected detail level
    await fetchAndRenderSummary(paperId, paragraphLength);
}

/**
 * Fetch summary from API or cache and render it
 * @param {string} paperId - The paper ID
 * @param {number} paragraphLength - Number of paragraphs to fetch
 */
async function fetchAndRenderSummary(paperId, paragraphLength) {
    const cacheKey = `${paperId}-${paragraphLength}`;
    
    try {
        let summaryData;
        
        // Check if summary is in cache
        if (summaryCache[cacheKey]) {
            summaryData = summaryCache[cacheKey];
        } else {
            // Show loading if fetching from server
            if (summaryContent.innerHTML === '' || !summaryContent.querySelector('.summary-text')) {
                showLoading(summaryContent, 'Loading summary');
            } else {
                // Add loading class to dim content
                const summaryTextEl = summaryContent.querySelector('.summary-text');
                if (summaryTextEl) summaryTextEl.classList.add('loading-overlay');
            }
            
            // Fetch summary from API
            const response = await fetch(`/api/summary/${paperId}/${paragraphLength}`);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            
            summaryData = await response.json();
            
            // Cache the result
            summaryCache[cacheKey] = summaryData;
        }
        
        // Hide loading
        hideLoading();
        const loadingOverlay = summaryContent.querySelector('.loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.remove('loading-overlay');
        
        // Render the summary
        renderSummary(summaryData.content);
    } catch (error) {
        console.error('Error fetching summary:', error);
        displayError('Failed to load summary. Please try again later.');
    }
}

/**
 * Render the summary with proper formatting and tag handling
 * @param {string} content - The summary content with tags
 */
function renderSummary(content) {
    const currentLevel = parseInt(detailSlider.value);
    
    // Process the <original> and <new> tags
    // If at level 1, don't highlight new content
    let processedContent;
    if (currentLevel === 1) {
        // At level 1, remove all tags without highlighting
        processedContent = content
            .replace(/<original>(([\s\S]*?))<\/original>/g, '$1')
            .replace(/<new>(([\s\S]*?))<\/new>/g, '$1');
    } else {
        // At other levels, highlight new content
        processedContent = content
            .replace(/<original>(([\s\S]*?))<\/original>/g, '<span class="original">$1</span>')
            .replace(/<new>(([\s\S]*?))<\/new>/g, '<span class="new">$1</span>');
    }
    
    // Parse markdown
    const htmlContent = marked.parse(processedContent);
    
    // Render summary
    summaryContent.innerHTML = `<div class="summary-text">${htmlContent}</div>`;
    
    // Render LaTeX
    renderMathInElement(summaryContent, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
        ],
        throwOnError: false
    });
    
    // Add transition effect
    summaryContent.classList.add('fade-in');
    setTimeout(() => {
        summaryContent.classList.remove('fade-in');
    }, 500);
    
    // Reset animations on new elements by forcing a reflow
    if (currentLevel > 1) {
        const newElements = document.querySelectorAll('.new');
        newElements.forEach(el => {
            // Force a reflow to restart the animation
            el.style.animation = 'none';
            el.offsetHeight; // Trigger reflow
            el.style.animation = 'fadeHighlight 4s ease-in-out forwards';
        });
    }
}

/**
 * Initialize the theme toggle functionality
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check for saved theme preference or respect OS preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    if (savedTheme) {
        document.body.dataset.theme = savedTheme;
    } else if (prefersDark) {
        document.body.dataset.theme = 'dark';
    }
    
    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.dataset.theme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        
        // Announce theme change for screen readers
        const message = `Switched to ${newTheme} mode`;
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('class', 'sr-only');
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    });
}

// API endpoints:
// - GET /api/papers - Returns a list of available papers
// - GET /api/paper/:id - Returns details for a specific paper
// - GET /api/summary/:id/:paragraphs - Returns a summary for a paper at specified detail level