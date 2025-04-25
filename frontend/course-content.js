// course-content.js - Manages course content display and editing functionality

/**
 * Initialize course content functionality
 * @param {Object} gameState - The game state object
 * @param {Object} uiManager - The UI manager
 * @returns {Object} - Course content module functions
 */
export function initCourseContent(gameState, uiManager) {
  // Create references to DOM elements we'll need
  let coursePopup = null;
  
  // Setup state for the course content
  const state = {
    isContentVisible: false
  };
  
  /**
   * Setup the course button event handler
   */
  function setupCourseButton() {
    const courseBtn = document.getElementById('showCourseBtn');
    if (courseBtn) {
      courseBtn.addEventListener('click', () => {
        if (gameState && gameState.courseContent) {
          showCoursePopup(gameState.courseContent);
        } else {
          showNotification('No course content available for this level', 'info');
        }
      });
      console.log('Course button initialized');
    } else {
      console.warn('Course button not found');
    }
  }
  
  /**
   * Show a notification to the user
   * @param {string} message - The message to show
   * @param {string} type - The type of notification (success, error, info)
   */
  function showNotification(message, type = 'info') {
    if (uiManager && uiManager.showNotification) {
      uiManager.showNotification(message, type);
    } else {
      // Fallback if uiManager doesn't have showNotification
      console.log(`[${type}] ${message}`);
      alert(message);
    }
  }
  
  /**
   * Create and display the course content popup
   * @param {Object} courseContent - The course content to display
   */
  function showCoursePopup(courseContent) {
    // Remove existing popup if any
    if (coursePopup && document.body.contains(coursePopup)) {
      document.body.removeChild(coursePopup);
    }
    
    // Create popup overlay
    coursePopup = document.createElement('div');
    coursePopup.className = 'course-popup-overlay';
    
    // Create popup container
    const container = document.createElement('div');
    container.className = 'course-popup-container';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'course-popup-header';
    
    const title = document.createElement('div');
    title.className = 'course-popup-title';
    title.textContent = courseContent.title || 'Course Content';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'course-popup-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(coursePopup);
      coursePopup = null;
      state.isContentVisible = false;
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'course-popup-content';
    
    // Handle empty content with a message
    if (!courseContent.content || !courseContent.content.trim()) {
      content.innerHTML = '<p><em>No content available for this course.</em></p>';
    } else {
      content.innerHTML = courseContent.content;
    }
    
    // Add images if available
    if (courseContent.images && courseContent.images.length > 0) {
      courseContent.images.forEach(image => {
        if (image.path) {
          const imgContainer = document.createElement('div');
          imgContainer.className = 'course-popup-image-container';
          
          const img = document.createElement('img');
          img.className = 'course-popup-image';
          img.src = image.path;
          img.alt = image.caption || 'Course image';
          
          imgContainer.appendChild(img);
          
          if (image.caption) {
            const caption = document.createElement('div');
            caption.className = 'course-popup-caption';
            caption.textContent = image.caption;
            imgContainer.appendChild(caption);
          }
          
          content.appendChild(imgContainer);
        }
      });
    }
    
    // Assemble popup
    container.appendChild(header);
    container.appendChild(content);
    coursePopup.appendChild(container);
    
    // Add keyboard event to close on Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(coursePopup);
        coursePopup = null;
        state.isContentVisible = false;
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Add to document
    document.body.appendChild(coursePopup);
    state.isContentVisible = true;
    
    console.log('Course popup displayed');
  }
  
  // Add updateCourseContent method to graphPersistence if it doesn't exist
  if (window.graphPersistence && !window.graphPersistence.updateCourseContent) {
    window.graphPersistence.updateCourseContent = async function(graphId, courseContent) {
      try {
        console.log("Updating course content for graph:", graphId);
        
        // Validate content
        if (!courseContent) {
          return { 
            success: false, 
            message: "No course content provided" 
          };
        }
        
        // Ensure content is properly structured
        const sanitizedContent = {
          title: (courseContent.title || '').trim(),
          content: (courseContent.content || '').trim(),
          images: Array.isArray(courseContent.images) ? courseContent.images : []
        };
        
        console.log("Course content being sent:", sanitizedContent);
        
        // Use the same API_URL that was initialized in graphSaverLoader.js
        const apiUrl = this.API_URL || window.graphPersistence.API_URL || "http://localhost:3000/api/graphs";
        
        console.log("Using API URL:", apiUrl);
        
        // Call the API to update just the course content
        const response = await fetch(`${apiUrl}/${graphId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            courseContent: sanitizedContent
          })
        });
        
        // Track response status
        console.log("Response status:", response.status);
        
        const result = await response.json();
        console.log("Full response from server:", result);
        
        if (result.success) {
          console.log("Course content updated successfully:", result.data);
          return { success: true, data: result.data };
        } else {
          console.error("Failed to update course content:", result.message);
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error("Error updating course content:", error);
        return { success: false, message: error.message };
      }
    };
  }
  
  /**
   * Extraire le contenu spécifique pour le début ou la fin du niveau
   * @param {string} type - Le type de contenu à extraire ('start' ou 'end')
   * @returns {string} - Le contenu HTML
   */
  function extractLevelContent(type) {
    if (!gameState || !gameState.courseContent) {
      return '';
    }

    const content = gameState.courseContent.content || '';
    
    // Créer un DOM temporaire pour analyser le contenu HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Trouver l'élément de début ou de fin de niveau
    const levelElement = tempDiv.querySelector(`.level-${type}`);
    
    if (!levelElement) {
      return '';
    }
    
    // Extraire juste le contenu (pas l'en-tête)
    const contentElement = levelElement.querySelector('.level-tag-content');
    return contentElement ? contentElement.innerHTML : '';
  }

  /**
   * Afficher le contenu de début de niveau
   */
  function showStartContent() {
    const startContent = extractLevelContent('start');
    if (startContent) {
      // Créer et afficher une notification ou popup avec ce contenu
      showLevelMessagePopup('Début du niveau', startContent);
    }
  }

  /**
   * Afficher le contenu de fin de niveau
   */
  function showEndContent() {
    const endContent = extractLevelContent('end');
    if (endContent) {
      // Créer et afficher une notification ou popup avec ce contenu
      showLevelMessagePopup('Niveau terminé', endContent);
    }
  }

  /**
   * Afficher une popup avec un message de niveau
   * @param {string} title - Le titre de la popup
   * @param {string} content - Le contenu HTML de la popup
   */
  function showLevelMessagePopup(title, content) {
    // Remove existing popup if any
    const existingPopup = document.querySelector('.level-message-popup');
    if (existingPopup) {
      document.body.removeChild(existingPopup);
    }
    
    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.className = 'level-message-popup';
    
    // Create popup container
    const container = document.createElement('div');
    container.className = 'level-message-container';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'level-message-header';
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    header.appendChild(titleEl);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'level-message-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    header.appendChild(closeBtn);
    
    // Create content
    const contentEl = document.createElement('div');
    contentEl.className = 'level-message-content';
    contentEl.innerHTML = content;
    
    // Create footer with continue button
    const footer = document.createElement('div');
    footer.className = 'level-message-footer';
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'primary-button';
    continueBtn.textContent = 'Continuer';
    continueBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    footer.appendChild(continueBtn);
    
    // Assemble popup
    container.appendChild(header);
    container.appendChild(contentEl);
    container.appendChild(footer);
    overlay.appendChild(container);
    
    // Add to document
    document.body.appendChild(overlay);
    
    // Add keyboard event to close on Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  }
  
  // Return public API
  return {
    setupCourseButton,
    showCoursePopup,
    isVisible: () => state.isContentVisible,
    hidePopup: () => {
      if (coursePopup && document.body.contains(coursePopup)) {
        document.body.removeChild(coursePopup);
        coursePopup = null;
        state.isContentVisible = false;
      }
    },
    extractLevelContent,
    showStartContent,
    showEndContent,
    showLevelMessagePopup
  };
}

// If loaded as a standalone script, create a global courseContent object
if (typeof window !== 'undefined') {
  window.courseContent = {
    isInitialized: false,
    
    init: function() {
      if (this.isInitialized) return;
      
      console.log('Initializing course content module...');
      
      // Create a simple state and utils if not in a game context
      const mockGameState = { 
        courseContent: window.cy && window.cy.courseContent ? window.cy.courseContent : null
      };
      
      const mockUIManager = {
        showNotification: function(message, type) {
          console.log(`[${type}] ${message}`);
          
          // Create a visual notification
          const notification = document.createElement('div');
          notification.textContent = message;
          notification.style.cssText = `
            position: fixed; 
            top: 20px; 
            right: 20px; 
            padding: 15px; 
            background-color: ${type === 'error' ? '#F44336' : type === 'success' ? '#4CAF50' : '#2196F3'}; 
            color: white; 
            border-radius: 4px; 
            z-index: 9999;
          `;
          
          document.body.appendChild(notification);
          
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 3000);
        }
      };
      
      // Create the course content functionality
      const courseContent = initCourseContent(mockGameState, mockUIManager);
      
      // Expose the functions
      Object.assign(this, courseContent);
      
      this.isInitialized = true;
      console.log('Course content module initialized in standalone mode');
    },
    
    showContent: function(content) {
      if (!this.isInitialized) {
        this.init();
      }
      
      if (this.showCoursePopup) {
        this.showCoursePopup(content);
      } else {
        console.error('showCoursePopup method not available');
      }
    }
  };
  
  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Defer initialization to ensure all other scripts have loaded
    setTimeout(() => {
      if (!window.courseContent.isInitialized) {
        window.courseContent.init();
      }
    }, 500);
  });
}