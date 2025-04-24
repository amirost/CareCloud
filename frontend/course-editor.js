// improved-course-editor.js - Enhanced course content editing with WYSIWYG editor

document.addEventListener("DOMContentLoaded", () => {
  // Create namespace for course editor
  window.courseEditor = {
    isInitialized: false,
    isDirty: false,
    
    // Initialize the course editor
    init: function() {
      if (this.isInitialized) return;
      
      console.log("Initializing improved course editor");
      
      // Create the course editor panel
      this.createEditorPanel();
      
      // Add tab button to editor buttons container
      this.addCourseEditorTab();
      
      this.isInitialized = true;
    },
    
    // Create the course editor panel with WYSIWYG editor
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
          
          <div class="form-group editor-container">
            <label>Content:</label>
            <div class="editor-toolbar">
              <div class="toolbar-group">
                <button type="button" data-command="formatBlock" data-value="h1" class="toolbar-btn" title="Heading 1">H1</button>
                <button type="button" data-command="formatBlock" data-value="h2" class="toolbar-btn" title="Heading 2">H2</button>
                <button type="button" data-command="formatBlock" data-value="h3" class="toolbar-btn" title="Heading 3">H3</button>
                <button type="button" data-command="formatBlock" data-value="p" class="toolbar-btn" title="Paragraph">P</button>
              </div>
              <div class="toolbar-group">
                <button type="button" data-command="bold" class="toolbar-btn" title="Bold"><b>B</b></button>
                <button type="button" data-command="italic" class="toolbar-btn" title="Italic"><i>I</i></button>
                <button type="button" data-command="underline" class="toolbar-btn" title="Underline"><u>U</u></button>
              </div>
              <div class="toolbar-group">
                <button type="button" data-command="insertUnorderedList" class="toolbar-btn" title="Bullet List">Liste à puces</button>
                <button type="button" data-command="insertOrderedList" class="toolbar-btn" title="Numbered List">Liste numérotée</button>
              </div>
              <div class="toolbar-group">
                <button type="button" data-command="justifyLeft" class="toolbar-btn" title="Align Left">Aligner à gauche</button>
                <button type="button" data-command="justifyCenter" class="toolbar-btn" title="Align Center">Aligner au centre</button>
                <button type="button" data-command="justifyRight" class="toolbar-btn" title="Align Right">Aligner à droite</button>
              </div>
              <div class="toolbar-group">
                <button type="button" data-command="createLink" class="toolbar-btn" title="Insert Link">Insérer un lien</button>
                <button type="button" data-command="unlink" class="toolbar-btn" title="Remove Link">Supprimer le lien</button>
              </div>
            </div>
            <div id="rich-text-editor" class="rich-text-editor" contenteditable="true"></div>
          </div>
          
          <div class="form-group">
            <label>Images:</label>
            <button id="add-image-btn" class="action-button"><i class="fas fa-plus"></i> Add Image</button>
            <div id="images-gallery" class="images-gallery"></div>
          </div>
          
          <div class="form-action-bar">
            <button id="previewCourseBtn" class="primary-button"><i class="fas fa-eye"></i> Preview</button>
            <button id="saveCourseBtn" class="action-button"><i class="fas fa-save"></i> Save Changes</button>
            <button id="cancelEditorBtn" class="secondary-button"><i class="fas fa-times"></i> Cancel</button>
          </div>
        </div>
      `;
      
      // Image modal HTML
      const imageModal = document.createElement('div');
      imageModal.id = 'image-modal';
      imageModal.className = 'image-modal';
      imageModal.innerHTML = `
        <div class="image-modal-content">
          <div class="modal-header">
            <h3>Add Image</h3>
            <button class="close-modal-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="image-url">Image URL:</label>
              <input type="text" id="image-url" placeholder="https://example.com/image.jpg">
            </div>
            <div class="form-group">
              <label for="image-caption">Caption (optional):</label>
              <input type="text" id="image-caption" placeholder="Image description">
            </div>
            <div class="form-group">
              <label>Alignment:</label>
              <div class="alignment-buttons">
                <button type="button" data-align="left" class="align-btn active"><i class="fas fa-align-left"></i></button>
                <button type="button" data-align="center" class="align-btn"><i class="fas fa-align-center"></i></button>
                <button type="button" data-align="right" class="align-btn"><i class="fas fa-align-right"></i></button>
              </div>
            </div>
            <div class="image-preview-container">
              <p class="preview-placeholder">Image preview will appear here</p>
              <img id="image-preview" class="image-preview" style="display: none;">
            </div>
          </div>
          <div class="modal-footer">
            <button class="secondary-button cancel-image-btn">Cancel</button>
            <button class="action-button confirm-image-btn">Add Image</button>
          </div>
        </div>
      `;
      
      // Add to document body
      document.body.appendChild(editorPanel);
      document.body.appendChild(imageModal);
      
      // Add event listeners
      this.setupEditorEvents(editorPanel, imageModal);
      
      // Setup rich text editor functionality
      this.setupRichTextEditor();
    },
    
    // Add tab button to editor buttons
    addCourseEditorTab: function() {
      const editorButtonsContainer = document.querySelector(".editor-buttons");
      if (!editorButtonsContainer) return;
      
      // Check if button already exists
      if (document.getElementById("courseEditorBtn")) return;
      
      const courseEditorBtn = document.createElement('button');
      courseEditorBtn.id = "courseEditorBtn";
      courseEditorBtn.className = "dynamic-button";
      courseEditorBtn.innerHTML = '<i class="fas fa-book"></i> Course Editor';
      courseEditorBtn.addEventListener('click', () => this.toggleCourseEditor());
      
      editorButtonsContainer.appendChild(courseEditorBtn);
    },
    
    // Setup event listeners for the editor
    setupEditorEvents: function(panel, imageModal) {
      // Close button
      const closeBtn = panel.querySelector('#closeCourseEditorBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          if (this.isDirty) {
            if (confirm('You have unsaved changes. Are you sure you want to close the editor?')) {
              this.toggleCourseEditor();
            }
          } else {
            this.toggleCourseEditor();
          }
        });
      }
      
      // Cancel button 
      const cancelBtn = panel.querySelector('#cancelEditorBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          if (this.isDirty) {
            if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
              this.toggleCourseEditor();
            }
          } else {
            this.toggleCourseEditor();
          }
        });
      }
      
      // Add image button
      const addImageBtn = panel.querySelector('#add-image-btn');
      if (addImageBtn) {
        addImageBtn.addEventListener('click', () => this.openImageModal());
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
      
      // Image modal events
      const closeModalBtn = imageModal.querySelector('.close-modal-btn');
      if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => this.closeImageModal());
      }
      
      const cancelImageBtn = imageModal.querySelector('.cancel-image-btn');
      if (cancelImageBtn) {
        cancelImageBtn.addEventListener('click', () => this.closeImageModal());
      }
      
      const confirmImageBtn = imageModal.querySelector('.confirm-image-btn');
      if (confirmImageBtn) {
        confirmImageBtn.addEventListener('click', () => this.addOrUpdateImage());
      }
      
      // Image URL input for preview
      const imageUrlInput = imageModal.querySelector('#image-url');
      if (imageUrlInput) {
        imageUrlInput.addEventListener('input', () => this.updateImagePreview());
      }
      
      // Alignment buttons
      const alignButtons = imageModal.querySelectorAll('.align-btn');
      if (alignButtons.length) {
        alignButtons.forEach(btn => {
          btn.addEventListener('click', (e) => {
            // Remove active class from all buttons
            alignButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            e.target.closest('.align-btn').classList.add('active');
          });
        });
      }
      
      // Input change tracking
      const titleInput = panel.querySelector('#course-title');
      const richTextEditor = panel.querySelector('#rich-text-editor');
      
      if (titleInput) {
        titleInput.addEventListener('input', () => {
          this.isDirty = true;
        });
      }
      
      if (richTextEditor) {
        richTextEditor.addEventListener('input', () => {
          this.isDirty = true;
        });
      }
      
      // Initialize image gallery
      this.imagesGallery = panel.querySelector('#images-gallery');
      this.images = [];
      
      // Initialize inputs
      this.titleInput = titleInput;
      this.richTextEditor = richTextEditor;
      this.imageModal = imageModal;
      
      // Store the current image being edited (if any)
      this.currentEditingImageIndex = -1;
    },
    
    // Setup rich text editor functionality
    setupRichTextEditor: function() {
      const toolbarButtons = document.querySelectorAll('.toolbar-btn');
      const editor = document.getElementById('rich-text-editor');
      
      if (!toolbarButtons.length || !editor) return;
      
      // Add event listeners to toolbar buttons
      toolbarButtons.forEach(button => {
        button.addEventListener('click', () => {
          const command = button.dataset.command;
          const value = button.dataset.value || null;
          
          if (command === 'createLink') {
            const url = prompt('Enter the link URL:');
            if (url) document.execCommand(command, false, url);
          } else {
            document.execCommand(command, false, value);
          }
          
          // Focus back to editor
          editor.focus();
          this.isDirty = true;
        });
      });
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
        this.isDirty = false;
      }
    },
    
    // Open image modal for adding/editing an image
    openImageModal: function(imageIndex = -1) {
      this.currentEditingImageIndex = imageIndex;
      const modal = document.getElementById('image-modal');
      const urlInput = modal.querySelector('#image-url');
      const captionInput = modal.querySelector('#image-caption');
      const confirmBtn = modal.querySelector('.confirm-image-btn');
      const alignButtons = modal.querySelectorAll('.align-btn');
      
      // Reset form
      urlInput.value = '';
      captionInput.value = '';
      
      // Reset alignment
      alignButtons.forEach(btn => btn.classList.remove('active'));
      alignButtons[0].classList.add('active'); // Default to left
      
      // Set values if editing an existing image
      if (imageIndex >= 0 && this.images[imageIndex]) {
        const image = this.images[imageIndex];
        urlInput.value = image.path || '';
        captionInput.value = image.caption || '';
        
        // Set alignment
        if (image.align) {
          alignButtons.forEach(btn => {
            if (btn.dataset.align === image.align) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          });
        }
        
        confirmBtn.textContent = 'Update Image';
      } else {
        confirmBtn.textContent = 'Add Image';
      }
      
      // Show modal
      modal.style.display = 'flex';
      
      // Update preview
      this.updateImagePreview();
    },
    
    // Close image modal
    closeImageModal: function() {
      const modal = document.getElementById('image-modal');
      modal.style.display = 'none';
      this.currentEditingImageIndex = -1;
    },
    
    // Update image preview in the modal
    updateImagePreview: function() {
      const modal = document.getElementById('image-modal');
      const urlInput = modal.querySelector('#image-url');
      const preview = modal.querySelector('#image-preview');
      const placeholder = modal.querySelector('.preview-placeholder');
      
      if (urlInput.value.trim()) {
        preview.src = urlInput.value;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        
        // Handle image load error
        preview.onerror = () => {
          preview.style.display = 'none';
          placeholder.style.display = 'block';
          placeholder.textContent = 'Error loading image. Please check the URL.';
        };
        
        // Handle image load success
        preview.onload = () => {
          preview.style.display = 'block';
          placeholder.style.display = 'none';
        };
      } else {
        preview.style.display = 'none';
        placeholder.style.display = 'block';
        placeholder.textContent = 'Image preview will appear here';
      }
    },
    
    // Add or update an image based on the modal form
    addOrUpdateImage: function() {
      const modal = document.getElementById('image-modal');
      const urlInput = modal.querySelector('#image-url');
      const captionInput = modal.querySelector('#image-caption');
      
      const url = urlInput.value.trim();
      if (!url) {
        alert('Please enter an image URL');
        return;
      }
      
      // Get selected alignment
      let alignment = 'left'; // Default
      const activeAlignBtn = modal.querySelector('.align-btn.active');
      if (activeAlignBtn) {
        alignment = activeAlignBtn.dataset.align;
      }
      
      // Create image object
      const imageObj = {
        path: url,
        caption: captionInput.value.trim(),
        align: alignment
      };
      
      // Either update existing or add new image
      if (this.currentEditingImageIndex >= 0) {
        this.images[this.currentEditingImageIndex] = imageObj;
      } else {
        this.images.push(imageObj);
      }
      
      // Update the gallery
      this.refreshImageGallery();
      
      // Close the modal
      this.closeImageModal();
      
      // Mark as dirty
      this.isDirty = true;
    },
    
    // Refresh the image gallery display
    refreshImageGallery: function() {
      if (!this.imagesGallery) return;
      
      // Clear gallery
      this.imagesGallery.innerHTML = '';
      
      // Add images to gallery
      this.images.forEach((image, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        galleryItem.innerHTML = `
          <div class="gallery-img-container">
            <img src="${image.path}" alt="${image.caption || 'Image'}" class="gallery-img">
          </div>
          <div class="gallery-item-info">
            <div class="gallery-caption">${image.caption || 'No caption'}</div>
            <div class="gallery-align">Align: ${image.align || 'left'}</div>
          </div>
          <div class="gallery-item-actions">
            <button class="edit-img-btn" title="Edit Image"><i class="fas fa-edit"></i></button>
            <button class="delete-img-btn" title="Delete Image"><i class="fas fa-trash"></i></button>
          </div>
        `;
        
        // Add event listeners for edit and delete buttons
        const editBtn = galleryItem.querySelector('.edit-img-btn');
        const deleteBtn = galleryItem.querySelector('.delete-img-btn');
        
        editBtn.addEventListener('click', () => this.openImageModal(index));
        
        deleteBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to delete this image?')) {
            this.images.splice(index, 1);
            this.refreshImageGallery();
            this.isDirty = true;
          }
        });
        
        this.imagesGallery.appendChild(galleryItem);
      });
      
      // Show empty state if no images
      if (this.images.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'gallery-empty';
        emptyState.textContent = 'No images added yet. Click "Add Image" to add images to your course.';
        this.imagesGallery.appendChild(emptyState);
      }
    },
    
    // Load current course content into the editor
    loadCurrentCourseContent: function() {
      // Try to get course content from the current graph
      const courseContent = window.cy && window.cy.courseContent ? 
        window.cy.courseContent : null;
      
      if (!courseContent) {
        console.log("No course content found for this graph");
        // Clear inputs
        if (this.titleInput) this.titleInput.value = '';
        if (this.richTextEditor) this.richTextEditor.innerHTML = '';
        this.images = [];
        this.refreshImageGallery();
        return;
      }
      
      console.log("Loading course content:", courseContent);
      
      // Set title and content
      if (this.titleInput) this.titleInput.value = courseContent.title || '';
      if (this.richTextEditor) this.richTextEditor.innerHTML = courseContent.content || '';
      
      // Load images
      this.images = [];
      if (courseContent.images && courseContent.images.length > 0) {
        courseContent.images.forEach(img => {
          this.images.push({
            path: img.path || '',
            caption: img.caption || '',
            align: img.align || 'left'
          });
        });
      }
      
      // Refresh gallery
      this.refreshImageGallery();
    },
    
    // Get the current course content from the editor
    getCourseContent: function() {
      if (!this.titleInput || !this.richTextEditor) return null;
      
      const content = {
        title: this.titleInput.value.trim(),
        content: this.richTextEditor.innerHTML.trim(),
        images: []
      };
      
      // Get images
      if (this.images && this.images.length > 0) {
        this.images.forEach(img => {
          if (img.path) {
            content.images.push({
              path: img.path,
              caption: img.caption || '',
              align: img.align || 'left'
            });
          }
        });
      }
      
      return content;
    },
    
    // Preview the course content
    previewCourse: function() {
      const content = this.getCourseContent();
      if (!content) {
        alert("Failed to get course content. Please check your inputs.");
        return;
      }
      
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
      
      if (!content.content.trim()) {
        contentElement.innerHTML = '<p><em>No content available for this course.</em></p>';
      } else {
        contentElement.innerHTML = content.content;
      }
      
      // Add images
      if (content.images && content.images.length > 0) {
        content.images.forEach(img => {
          if (img.path && img.path.trim()) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'course-popup-image-container';
            imgContainer.style.textAlign = img.align || 'left';
            
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
          }
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
      if (!content) {
        alert("Failed to get course content. Please check your inputs.");
        return;
      }
      
      // Validate content is not empty
      if (!content.title.trim()) {
        alert("Please enter a title for the course content.");
        this.titleInput.focus();
        return;
      }
      
      console.log("Saving course content:", content);
      
      // Store content in the graph memory
      if (window.cy) {
        window.cy.courseContent = content;
        
        // Try to directly save to database if possible
        if (window.graphPersistence) {
          // Check if we have a loaded graph first
          const graphId = window.cy.id;
          
          if (graphId && window.graphPersistence.updateCourseContent) {
            // We have a loaded graph ID and can update course content directly
            window.graphPersistence.updateCourseContent(graphId, content)
              .then(result => {
                if (result.success) {
                  alert("Course content saved successfully to the database!");
                  this.isDirty = false;
                } else {
                  alert(`Failed to save course content: ${result.message}\nRemember to save the graph to persist changes.`);
                }
              })
              .catch(error => {
                console.error("Error saving course content:", error);
                alert(`Error saving course content: ${error.message}\nRemember to save the graph to persist changes.`);
              });
          } 
          // If no direct course content update or no graph ID, offer to save whole graph
          else if (window.graphPersistence.saveGraph) {
            if (confirm("Course content saved to graph memory. Would you like to save the entire graph now to persist changes?")) {
              const graphName = window.cy.graphName || prompt("Enter a name for this graph:", "Graph with course content");
              
              if (graphName) {
                window.graphPersistence.saveGraph(graphName)
                  .then(result => {
                    if (result.success) {
                      alert("Graph saved with course content successfully!");
                      this.isDirty = false;
                    } else {
                      alert(`Failed to save graph: ${result.message}`);
                    }
                  })
                  .catch(err => {
                    console.error("Error saving graph:", err);
                    alert(`Error saving graph: ${err.message}`);
                  });
              }
            } else {
              // User chose not to save graph immediately
              alert("Course content saved in memory! Remember to save the graph to persist changes.");
            }
          } else {
            // No save functions available
            alert("Course content saved to graph memory! Remember to save the graph to persist changes.");
          }
        } else {
          // No graph persistence available
          alert("Course content saved to graph memory! Remember to save the graph to persist changes.");
        }
        
        this.isDirty = false;
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
        if (window.courseEditor && !window.courseEditor.isInitialized) {
          window.courseEditor.init();
        }
      }, 500);
    });
  }
});