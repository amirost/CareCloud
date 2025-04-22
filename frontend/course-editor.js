// course-editor.js - Adds course content editing to the graph editor

document.addEventListener("DOMContentLoaded", () => {
    // Create namespace for course editor
    window.courseEditor = {
      // Initialize the course editor
      init: function() {
        console.log("Initializing course editor");
        
        // Create the course editor panel
        this.createEditorPanel();
        
        // Add tab button to editor buttons container
        this.addCourseEditorTab();
      },
      
      // Create the course editor panel
      createEditorPanel: function() {
        // Create editor panel container
        const editorPanel = document.createElement('div');
        editorPanel.id = 'course-editor-panel';
        editorPanel.className = 'course-editor-panel';
        editorPanel.style.display = 'none'; // Hidden by default
        
        // Add panel content
        editorPanel.innerHTML = `
          <div class="course-editor-header">
            <h3>Course Content Editor</h3>
            <button id="closeCourseEditorBtn" class="close-button">&times;</button>
          </div>
          
          <div class="course-editor-content">
            <div class="form-group">
              <label for="course-title">Title:</label>
              <input type="text" id="course-title" placeholder="Enter course title">
            </div>
            
            <div class="form-group">
              <label for="course-content">Content (HTML supported):</label>
              <textarea id="course-content" rows="10" placeholder="Enter course content"></textarea>
              <div class="editor-help">
                You can use basic HTML tags: &lt;h1&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;b&gt;, &lt;i&gt;, &lt;ul&gt;, &lt;li&gt;, etc.
              </div>
            </div>
            
            <div class="form-group">
              <label>Images:</label>
              <button id="add-image-btn" class="small-button">Add Image</button>
              <div id="course-images-container"></div>
            </div>
            
            <div class="form-group">
              <button id="previewCourseBtn" class="primary-button">Preview</button>
              <button id="saveCourseBtn" class="action-button">Save Changes</button>
            </div>
          </div>
        `;
        
        // Add to document body
        document.body.appendChild(editorPanel);
        
        // Add event listeners
        this.setupEditorEvents(editorPanel);
      },
      
      // Add tab button to editor buttons
      addCourseEditorTab: function() {
        const editorButtonsContainer = document.querySelector(".editor-buttons");
        if (!editorButtonsContainer) return;
        
        const courseEditorBtn = document.createElement('button');
        courseEditorBtn.id = "courseEditorBtn";
        courseEditorBtn.className = "dynamic-button";
        courseEditorBtn.textContent = "Course Editor";
        courseEditorBtn.addEventListener('click', () => this.toggleCourseEditor());
        
        editorButtonsContainer.appendChild(courseEditorBtn);
      },
      
      // Setup event listeners for the editor
      setupEditorEvents: function(panel) {
        // Close button
        const closeBtn = panel.querySelector('#closeCourseEditorBtn');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => this.toggleCourseEditor());
        }
        
        // Add image button
        const addImageBtn = panel.querySelector('#add-image-btn');
        if (addImageBtn) {
          addImageBtn.addEventListener('click', () => this.addImageInput());
        }
        
        // Preview button
        const previewBtn = panel.querySelector('#previewCourseBtn');
        if (previewBtn) {
          previewBtn.addEventListener('click', () => this.previewCourse());
        }
        
        // Save button
        const saveBtn = panel.querySelector('#saveCourseBtn');
        if (saveBtn) {
          saveBtn.addEventListener('click', () => this.saveCourseContent());
        }
        
        // Initialize image container
        this.imagesContainer = panel.querySelector('#course-images-container');
        this.images = [];
        
        // Initialize inputs
        this.titleInput = panel.querySelector('#course-title');
        this.contentTextarea = panel.querySelector('#course-content');
      },
      
      // Toggle course editor visibility
      toggleCourseEditor: function() {
        const panel = document.getElementById('course-editor-panel');
        if (!panel) return;
        
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        
        // If showing the panel, load current course content
        if (!isVisible) {
          this.loadCurrentCourseContent();
        }
      },
      
      // Add a new image input
      addImageInput: function() {
        const imageIndex = this.images.length;
        
        const imageBlock = document.createElement('div');
        imageBlock.className = 'course-image-block';
        
        imageBlock.innerHTML = `
          <div class="image-inputs">
            <input type="text" class="image-path" placeholder="Image URL">
            <input type="text" class="image-caption" placeholder="Image caption (optional)">
          </div>
          <button class="remove-image-btn small-button">Remove</button>
        `;
        
        // Add remove event listener
        const removeBtn = imageBlock.querySelector('.remove-image-btn');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => this.removeImage(imageBlock));
        }
        
        this.imagesContainer.appendChild(imageBlock);
        this.images.push({ block: imageBlock, path: '', caption: '' });
      },
      
      // Remove an image input
      removeImage: function(block) {
        const index = this.images.findIndex(img => img.block === block);
        if (index !== -1) {
          this.images.splice(index, 1);
          this.imagesContainer.removeChild(block);
        }
      },
      
      // Load current course content into the editor
      loadCurrentCourseContent: function() {
        // Try to get course content from the current graph
        const courseContent = window.cy && window.cy.courseContent ? 
          window.cy.courseContent : null;
        
        if (!courseContent) {
          console.log("No course content found for this graph");
          return;
        }
        
        // Set title and content
        if (this.titleInput) this.titleInput.value = courseContent.title || '';
        if (this.contentTextarea) this.contentTextarea.value = courseContent.content || '';
        
        // Clear existing images
        if (this.imagesContainer) this.imagesContainer.innerHTML = '';
        this.images = [];
        
        // Add images
        if (courseContent.images && courseContent.images.length > 0) {
          courseContent.images.forEach(img => {
            this.addImageInput();
            const lastIndex = this.images.length - 1;
            const block = this.images[lastIndex].block;
            
            const pathInput = block.querySelector('.image-path');
            const captionInput = block.querySelector('.image-caption');
            
            if (pathInput) pathInput.value = img.path || '';
            if (captionInput) captionInput.value = img.caption || '';
          });
        }
      },
      
      // Get the current course content from the editor
      getCourseContent: function() {
        if (!this.titleInput || !this.contentTextarea) return null;
        
        const content = {
          title: this.titleInput.value.trim(),
          content: this.contentTextarea.value.trim(),
          images: []
        };
        
        // Get images
        this.images.forEach(img => {
          const pathInput = img.block.querySelector('.image-path');
          const captionInput = img.block.querySelector('.image-caption');
          
          if (pathInput && pathInput.value.trim()) {
            content.images.push({
              path: pathInput.value.trim(),
              caption: captionInput ? captionInput.value.trim() : ''
            });
          }
        });
        
        return content;
      },
      
      // Preview the course content
      previewCourse: function() {
        const content = this.getCourseContent();
        if (!content) return;
        
        this.showPreviewPopup(content);
      },
      
      // Show course preview popup
      showPreviewPopup: function(content) {
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
        title.textContent = content.title || 'Course Preview';
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
        const contentElement = document.createElement('div');
        contentElement.className = 'course-popup-content';
        contentElement.innerHTML = content.content || '';
        
        // Add images
        if (content.images && content.images.length > 0) {
          content.images.forEach(img => {
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
            
            contentElement.appendChild(imgContainer);
          });
        }
        
        container.appendChild(contentElement);
        overlay.appendChild(container);
        
        // Add keyboard event to close on Escape key
        const handleKeyDown = (e) => {
          if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeyDown);
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        
        document.body.appendChild(overlay);
      },
      
      // Save course content to the graph
      saveCourseContent: function() {
        const content = this.getCourseContent();
        if (!content) return;
        
        // Store course content in the graph
        if (window.cy) {
          window.cy.courseContent = content;
          console.log("Course content saved to graph:", content);
          
          // Show confirmation
          alert("Course content saved! Remember to save the graph to persist changes.");
        } else {
          alert("Cannot save course content: Cytoscape not initialized");
        }
      }
    };
    
    // Initialize course editor when editor mode is active
    const editorModeBtn = document.getElementById("editorModeBtn");
    if (editorModeBtn) {
      editorModeBtn.addEventListener('click', () => {
        // Initialize course editor after a short delay to ensure other components are loaded
        setTimeout(() => {
          if (window.courseEditor && !window.courseEditor.initialized) {
            window.courseEditor.init();
            window.courseEditor.initialized = true;
          }
        }, 500);
      });
    }
  });