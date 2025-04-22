// course-content.js - Handles displaying course content in a popup

export function initCourseContent(gameState, uiManager) {
    return {
      // Setup the course button
      setupCourseButton() {
        const showCourseBtn = document.getElementById('showCourseBtn');
        if (showCourseBtn) {
          showCourseBtn.addEventListener('click', () => {
            this.showCoursePopup();
          });
          console.log("Course button initialized");
        } else {
          console.warn("Course button not found");
        }
      },
      
      // Show the course popup
      showCoursePopup() {
        // Check if course content exists
        if (!gameState.courseContent) {
          uiManager.showNotification("Aucun contenu de cours disponible pour ce niveau", "warning");
          return;
        }
        
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'course-popup-overlay';
        
        // Create popup container
        const container = document.createElement('div');
        container.className = 'course-popup-container';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'course-popup-header';
        
        // Add title
        const title = document.createElement('div');
        title.className = 'course-popup-title';
        title.textContent = gameState.courseContent.title || 'Cours';
        header.appendChild(title);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'course-popup-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
          document.body.removeChild(overlay);
        });
        header.appendChild(closeBtn);
        
        container.appendChild(header);
        
        // Add content
        const content = document.createElement('div');
        content.className = 'course-popup-content';
        content.innerHTML = gameState.courseContent.content || '';
        
        // Add images if they exist
        if (gameState.courseContent.images && gameState.courseContent.images.length > 0) {
          gameState.courseContent.images.forEach(img => {
            const imgContainer = document.createElement('div');
            
            const imgElement = document.createElement('img');
            imgElement.src = img.path;
            imgElement.alt = img.caption || '';
            imgElement.className = 'course-popup-image';
            imgContainer.appendChild(imgElement);
            
            if (img.caption) {
              const caption = document.createElement('div');
              caption.className = 'course-popup-caption';
              caption.textContent = img.caption;
              imgContainer.appendChild(caption);
            }
            
            content.appendChild(imgContainer);
          });
        }
        
        container.appendChild(content);
        overlay.appendChild(container);
        
        // Add keyboard event to close on Escape key
        const handleKeyDown = (e) => {
          if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeyDown);
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        
        // Add click event to close when clicking outside the container
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeyDown);
          }
        });
        
        document.body.appendChild(overlay);
      }
    };
  }