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
    let courseEditorPanel = null;
    
    // Setup state for the course content
    const state = {
      title: '',
      content: '',
      images: [],
      isEditorOpen: false,
      isDirty: false // Track if changes have been made
    };
    
    /**
     * Setup the course button event handler
     */
    function setupCourseButton() {
      const courseBtn = document.getElementById('showCourseBtn');
      if (courseBtn) {
        courseBtn.addEventListener('click', () => {
          if (gameState.courseContent) {
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
        alert(message);
      }
    }
    
    /**
     * Create and display the course content popup
     * @param {Object} courseContent - The course content to display
     */
    function showCoursePopup(courseContent) {
      // Remove existing popup if any
      if (coursePopup) {
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
      });
      
      header.appendChild(title);
      header.appendChild(closeBtn);
      
      // Create content
      const content = document.createElement('div');
      content.className = 'course-popup-content';
      content.innerHTML = courseContent.content || 'No content available.';
      
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
      
      // Add to document
      document.body.appendChild(coursePopup);
      
      console.log('Course popup displayed');
    }
    
    /**
     * Open course editor panel
     */
    function openCourseEditor() {
      // If we're already in the editor, just return
      if (state.isEditorOpen) return;
      
      // Get current course content
      const currentContent = gameState.courseContent || {
        title: '',
        content: '',
        images: []
      };
      
      // Update state
      state.title = currentContent.title || '';
      state.content = currentContent.content || '';
      state.images = Array.isArray(currentContent.images) ? [...currentContent.images] : [];
      state.isDirty = false;
      
      // Find existing course editor or create one if it doesn't exist
      courseEditorPanel = document.querySelector('.course-editor-panel');
      
      if (!courseEditorPanel) {
        // Create the editor panel
        courseEditorPanel = document.createElement('div');
        courseEditorPanel.className = 'course-editor-panel';
        courseEditorPanel.style.display = 'none'; // Start hidden
        
        // Create the header
        const header = document.createElement('div');
        header.className = 'course-editor-header';
        
        const title = document.createElement('h3');
        title.textContent = 'Course Content Editor';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-button';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
          if (state.isDirty) {
            if (confirm('You have unsaved changes. Are you sure you want to close the editor?')) {
              closeCourseEditor();
            }
          } else {
            closeCourseEditor();
          }
        });
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create content
        const editorContent = document.createElement('div');
        editorContent.className = 'course-editor-content';
        
        // Title field
        const titleGroup = document.createElement('div');
        titleGroup.className = 'form-group';
        
        const titleLabel = document.createElement('label');
        titleLabel.textContent = 'Title:';
        titleLabel.setAttribute('for', 'course-title');
        
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.id = 'course-title';
        titleInput.placeholder = 'Enter course title';
        titleInput.value = state.title;
        titleInput.addEventListener('input', () => {
          state.title = titleInput.value;
          state.isDirty = true;
        });
        
        titleGroup.appendChild(titleLabel);
        titleGroup.appendChild(titleInput);
        
        // Content field
        const contentGroup = document.createElement('div');
        contentGroup.className = 'form-group';
        
        const contentLabel = document.createElement('label');
        contentLabel.textContent = 'Content (HTML supported):';
        contentLabel.setAttribute('for', 'course-content');
        
        const contentTextarea = document.createElement('textarea');
        contentTextarea.id = 'course-content';
        contentTextarea.rows = 10;
        contentTextarea.placeholder = 'Enter course content';
        contentTextarea.value = state.content;
        contentTextarea.addEventListener('input', () => {
          state.content = contentTextarea.value;
          state.isDirty = true;
        });
        
        const editorHelp = document.createElement('div');
        editorHelp.className = 'editor-help';
        editorHelp.innerHTML = 'You can use basic HTML tags: &lt;h1&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;b&gt;, &lt;i&gt;, &lt;ul&gt;, &lt;li&gt;, etc.';
        
        contentGroup.appendChild(contentLabel);
        contentGroup.appendChild(contentTextarea);
        contentGroup.appendChild(editorHelp);
        
        // Images
        const imagesGroup = document.createElement('div');
        imagesGroup.className = 'form-group';
        
        const imagesLabel = document.createElement('label');
        imagesLabel.textContent = 'Images:';
        
        const addImageBtn = document.createElement('button');
        addImageBtn.id = 'add-image-btn';
        addImageBtn.className = 'small-button';
        addImageBtn.textContent = 'Add Image';
        addImageBtn.addEventListener('click', addImageField);
        
        const imagesContainer = document.createElement('div');
        imagesContainer.id = 'course-images-container';
        
        // Add existing images
        state.images.forEach(image => {
          addImageField(image);
        });
        
        imagesGroup.appendChild(imagesLabel);
        imagesGroup.appendChild(addImageBtn);
        imagesGroup.appendChild(imagesContainer);
        
        // Buttons
        const buttonsGroup = document.createElement('div');
        buttonsGroup.className = 'form-group';
        
        const previewBtn = document.createElement('button');
        previewBtn.id = 'previewCourseBtn';
        previewBtn.className = 'primary-button';
        previewBtn.textContent = 'Preview';
        previewBtn.addEventListener('click', previewCourseContent);
        
        const saveBtn = document.createElement('button');
        saveBtn.id = 'saveCourseBtn';
        saveBtn.className = 'action-button';
        saveBtn.textContent = 'Save Changes';
        saveBtn.addEventListener('click', saveCourseContent);
        
        buttonsGroup.appendChild(previewBtn);
        buttonsGroup.appendChild(saveBtn);
        
        // Assemble editor
        editorContent.appendChild(titleGroup);
        editorContent.appendChild(contentGroup);
        editorContent.appendChild(imagesGroup);
        editorContent.appendChild(buttonsGroup);
        
        courseEditorPanel.appendChild(header);
        courseEditorPanel.appendChild(editorContent);
        
        // Add to document
        document.body.appendChild(courseEditorPanel);
      } else {
        // Update existing editor fields with current content
        const titleInput = courseEditorPanel.querySelector('#course-title');
        if (titleInput) titleInput.value = state.title;
        
        const contentTextarea = courseEditorPanel.querySelector('#course-content');
        if (contentTextarea) contentTextarea.value = state.content;
        
        // Clear and recreate image fields
        const imagesContainer = courseEditorPanel.querySelector('#course-images-container');
        if (imagesContainer) {
          imagesContainer.innerHTML = '';
          state.images.forEach(image => {
            addImageField(image);
          });
        }
      }
      
      // Show the editor
      courseEditorPanel.style.display = 'flex';
      state.isEditorOpen = true;
      
      console.log('Course editor opened');
    }
    
    /**
     * Close course editor panel
     */
    function closeCourseEditor() {
      if (courseEditorPanel) {
        courseEditorPanel.style.display = 'none';
      }
      state.isEditorOpen = false;
      console.log('Course editor closed');
    }
    
    /**
     * Toggle course editor panel
     */
    function toggleCourseEditor() {
      if (state.isEditorOpen) {
        closeCourseEditor();
      } else {
        openCourseEditor();
      }
    }
    
    /**
     * Add an image field to the editor
     * @param {Object} image - Optional existing image data
     */
    function addImageField(image = null) {
      const imagesContainer = document.getElementById('course-images-container');
      if (!imagesContainer) return;
      
      const imageBlock = document.createElement('div');
      imageBlock.className = 'course-image-block';
      
      const imageInputs = document.createElement('div');
      imageInputs.className = 'image-inputs';
      
      // Path input
      const pathInput = document.createElement('input');
      pathInput.type = 'text';
      pathInput.placeholder = 'Image URL or path';
      pathInput.value = image && image.path ? image.path : '';
      
      // Caption input
      const captionInput = document.createElement('input');
      captionInput.type = 'text';
      captionInput.placeholder = 'Image caption (optional)';
      captionInput.value = image && image.caption ? image.caption : '';
      
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'small-button remove-image-btn';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        imagesContainer.removeChild(imageBlock);
        updateImagesState();
      });
      
      // Add input event listeners to update state
      pathInput.addEventListener('input', updateImagesState);
      captionInput.addEventListener('input', updateImagesState);
      
      // Assemble field
      imageInputs.appendChild(pathInput);
      imageInputs.appendChild(captionInput);
      imageBlock.appendChild(imageInputs);
      imageBlock.appendChild(removeBtn);
      
      imagesContainer.appendChild(imageBlock);
      
      // Update state after adding
      updateImagesState();
    }
    
    /**
     * Update the images state based on current form inputs
     */
    function updateImagesState() {
      const imagesContainer = document.getElementById('course-images-container');
      if (!imagesContainer) return;
      
      const images = [];
      const imageBlocks = imagesContainer.querySelectorAll('.course-image-block');
      
      imageBlocks.forEach(block => {
        const inputs = block.querySelectorAll('input');
        if (inputs.length >= 2) {
          const path = inputs[0].value.trim();
          const caption = inputs[1].value.trim();
          
          if (path) {
            images.push({ path, caption });
          }
        }
      });
      
      state.images = images;
      state.isDirty = true;
    }
    
    /**
     * Preview the course content
     */
    function previewCourseContent() {
      const previewContent = {
        title: state.title,
        content: state.content,
        images: state.images
      };
      
      showCoursePopup(previewContent);
    }
    
    /**
     * Save course content to the game state and graph data
     */
    function saveCourseContent() {
        // Validate content
        if (!state.title.trim()) {
          showNotification('Please enter a title for the course content', 'error');
          return;
        }
        
        // Ensure we have the latest content from the form
        const titleInput = document.getElementById('course-title');
        const contentTextarea = document.getElementById('course-content');
        
        if (titleInput) state.title = titleInput.value.trim();
        if (contentTextarea) state.content = contentTextarea.value;
        
        // Log content to help with debugging
        console.log("Saving course content:", {
          title: state.title,
          contentLength: state.content.length,
          images: state.images.length
        });
        
        // Create content object
        const courseContentData = {
          title: state.title,
          content: state.content,
          images: state.images
        };
        
        // Update game state
        if (gameState) {
          gameState.courseContent = courseContentData;
          console.log("Course content saved to game state");
        }
        
        // CRITICAL: Make sure it's saved to the Cytoscape instance for graph persistence
        if (window.cy) {
          window.cy.courseContent = courseContentData;
          console.log("Course content saved to Cytoscape instance:", window.cy.courseContent);
        }
        
        // Save to graph if we have a loaded graph ID
        if (gameState && gameState.loadedGraphId && window.graphPersistence && window.graphPersistence.updateCourseContent) {
          window.graphPersistence.updateCourseContent(gameState.loadedGraphId, courseContentData)
            .then(result => {
              if (result.success) {
                showNotification('Course content saved successfully', 'success');
                state.isDirty = false;
              } else {
                showNotification('Failed to save course content: ' + result.message, 'error');
              }
            })
            .catch(error => {
              showNotification('Error saving course content: ' + error.message, 'error');
            });
        } else if (window.cy) {
          // Just rely on window.cy.courseContent being saved with the graph
          showNotification('Course content saved locally', 'success');
          state.isDirty = false;
        } else {
          showNotification('Course content saved to game state', 'info');
          state.isDirty = false;
        }
      }
    
    // Add updateCourseContent method to graphPersistence if it doesn't exist
    if (window.graphPersistence && !window.graphPersistence.updateCourseContent) {
      window.graphPersistence.updateCourseContent = async function(graphId, courseContent) {
        try {
          // Call the API to update just the course content
          const response = await fetch(`${this.API_URL || 'http://localhost:3000/api/graphs'}/${graphId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ courseContent })
          });
          
          return await response.json();
        } catch (error) {
          console.error("Error updating course content:", error);
          return { success: false, message: error.message };
        }
      };
    }
    
    // Return public API
    return {
      setupCourseButton,
      showCoursePopup,
      openCourseEditor,
      closeCourseEditor,
      toggleCourseEditor,
      previewCourseContent,
      saveCourseContent
    };
  }
  
  // If loaded as a standalone script, create a global courseEditor object
  if (typeof window !== 'undefined') {
    window.courseEditor = {
      isInitialized: false,
      
      init: function() {
        if (this.isInitialized) return;
        
        console.log('Initializing course editor...');
        
        // Create a simple state and utils if not in a game context
        const mockGameState = { 
          courseContent: window.cy && window.cy.courseContent ? window.cy.courseContent : null
        };
        
        const mockUIManager = {
          showNotification: function(message, type) {
            const notificationTypes = {
              success: 'background-color: #4CAF50; color: white;',
              error: 'background-color: #F44336; color: white;',
              info: 'background-color: #2196F3; color: white;'
            };
            
            const style = notificationTypes[type] || notificationTypes.info;
            
            console.log(`%c${message}`, style);
            
            // Create a visual notification
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 15px; ${style} border-radius: 4px; z-index: 9999;`;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification);
              }
            }, 3000);
          }
        };
        
        // Create the editor functionality
        const courseContent = initCourseContent(mockGameState, mockUIManager);
        
        // Expose the functions
        Object.assign(this, courseContent);
        
        // Set up button handlers for the editor
        this.setupEditorButtons();
        
        this.isInitialized = true;
        console.log('Course editor initialized in standalone mode');
      },
      
      setupEditorButtons: function() {
        // Set up the course editor button
        const courseEditorBtn = document.getElementById('courseEditorBtn');
        if (courseEditorBtn) {
          console.log('Found course editor button, attaching handler');
          courseEditorBtn.addEventListener('click', () => {
            console.log('Course editor button clicked');
            this.toggleCourseEditor();
          });
        } else {
          console.warn('Course editor button not found in the DOM');
        }
      },
      
      toggleCourseEditor: function() {
        if (!this.isInitialized) {
          this.init();
        }
        
        console.log('Toggling course editor');
        if (this.openCourseEditor) {
          this.openCourseEditor();
        } else {
          console.error('openCourseEditor method not available');
        }
      }
    };
    
    // Auto-initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        // Defer initialization to ensure all other scripts have loaded
        if (!window.courseEditor.isInitialized) {
          window.courseEditor.init();
        }
      }, 500);
    });
  }