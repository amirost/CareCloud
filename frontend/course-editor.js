document.addEventListener('DOMContentLoaded', () => {
  const IMAGESFOLDER = 'http://127.0.0.1:5500/frontend/Images/';

  window.courseEditor = {
    isInitialized: false,
    isDirty: false,

    init() {
      if (this.isInitialized) return;
      this.createEditorPanel();
      this.addCourseEditorTab();
      this.isInitialized = true;
    },

    createEditorPanel() {
      const editorPanel = document.createElement('div');
      editorPanel.id = 'course-editor-panel';
      editorPanel.className = 'course-editor-panel';
      editorPanel.style.display = 'none';
      editorPanel.innerHTML = `
        <div class='course-editor-header'>
          <h3>Course Content Editor</h3>
          <button id='closeCourseEditorBtn' class='close-button'>&times;</button>
        </div>
        <div class='course-editor-content'>
          <div class='form-group'>
            <label for='course-title'>Title:</label>
            <input type='text' id='course-title' placeholder='Enter course title'>
          </div>
          <div class='form-group editor-container'>
            <label>Content:</label>
            <div class='editor-toolbar'>
              <button type='button' data-command='formatBlock' data-value='h1' class='toolbar-btn'>H1</button>
              <button type='button' data-command='formatBlock' data-value='h2' class='toolbar-btn'>H2</button>
              <button type='button' data-command='formatBlock' data-value='h3' class='toolbar-btn'>H3</button>
              <button type='button' data-command='formatBlock' data-value='p' class='toolbar-btn'>P</button>
              <button type='button' data-command='bold' class='toolbar-btn'><b>B</b></button>
              <button type='button' data-command='italic' class='toolbar-btn'><i>I</i></button>
              <button type='button' data-command='underline' class='toolbar-btn'><u>U</u></button>
              <!-- BOUTONS DE LISTE SUPPRIMÉS -->
              <button type='button' data-command='justifyLeft' class='toolbar-btn'>L</button>
              <button type='button' data-command='justifyCenter' class='toolbar-btn'>C</button>
              <button type='button' data-command='justifyRight' class='toolbar-btn'>R</button>
              <button type='button' data-command='createLink' class='toolbar-btn'>Link</button>
              <button type='button' data-command='unlink' class='toolbar-btn'>Unlink</button>
              <button type='button' data-command='insertLevelTag' data-value='start' class='toolbar-btn'>Start</button>
              <button type='button' data-command='insertLevelTag' data-value='end' class='toolbar-btn'>End</button>
              <button type='button' class='toolbar-btn insert-image-btn'><i class='fas fa-image'></i>Insérer une image</button>
            </div>
            <div id='rich-text-editor' class='rich-text-editor' contenteditable='true'></div>
          </div>
          <div class='form-action-bar'>
            <button id='previewCourseBtn' class='primary-button'><i class='fas fa-eye'></i> Preview</button>
            <button id='saveCourseBtn' class='action-button'><i class='fas fa-save'></i> Save Changes</button>
            <button id='cancelEditorBtn' class='secondary-button'><i class='fas fa-times'></i> Cancel</button>
          </div>
        </div>
      `;

      const imageModal = document.createElement('div');
      imageModal.id = 'image-insert-modal';
      imageModal.className = 'image-insert-modal';
      imageModal.style.display = 'none';
      imageModal.innerHTML = `
        <div class='image-insert-modal-content'>
          <div class='modal-header'>
            <span class='close-image-modal'>&times;</span>
            <h4>Insérer une image</h4>
          </div>
          <div class='modal-body'>
            <input type='text' id='image-url-input' placeholder='Nom du fichier (ex: antenna.png)' style='width:100%;padding:6px;margin-bottom:8px;'>
            <input type='text' id='image-alt-input' placeholder='Texte alternatif (optionnel)' style='width:100%;padding:6px;'>
            <button id='confirm-image-insert' class='action-button' style='margin-top:10px;'>Insérer</button>
          </div>
        </div>
      `;

      document.body.appendChild(editorPanel);
      document.body.appendChild(imageModal);
      document.execCommand('defaultParagraphSeparator', false, 'p');
      this.setupEditorEvents(editorPanel, imageModal);
      this.setupRichTextEditor();
    },

    addCourseEditorTab() {
      const container = document.querySelector('.editor-buttons');
      if (!container || document.getElementById('courseEditorBtn')) return;
      const btn = document.createElement('button');
      btn.id = 'courseEditorBtn';
      btn.className = 'dynamic-button';
      btn.innerHTML = "<i class='fas fa-book'></i> Course Editor";
      btn.addEventListener('click', () => this.toggleCourseEditor());
      container.appendChild(btn);
    },

    setupEditorEvents(panel, imageModal) {
      panel.querySelector('#closeCourseEditorBtn').addEventListener('click', () => {
        if (this.isDirty && !confirm('You have unsaved changes. Close anyway?')) return;
        this.toggleCourseEditor();
      });
      panel.querySelector('#cancelEditorBtn').addEventListener('click', () => {
        if (this.isDirty && !confirm('You have unsaved changes. Cancel anyway?')) return;
        this.toggleCourseEditor();
      });
      panel.querySelector('#previewCourseBtn').addEventListener('click', () => this.previewCourse());
      panel.querySelector('#saveCourseBtn').addEventListener('click', () => this.saveCourseContent());
      this.titleInput = panel.querySelector('#course-title');
      this.richTextEditor = panel.querySelector('#rich-text-editor');
      this.titleInput.addEventListener('input', () => this.isDirty = true);
      this.richTextEditor.addEventListener('input', () => this.isDirty = true);
      this.imageModal = imageModal;
    },

    setupRichTextEditor() {
      const toolbarButtons = document.querySelectorAll('.toolbar-btn');
      const editor = document.getElementById('rich-text-editor');
      if (!toolbarButtons.length || !editor) return;

      let savedRange = null;
      const saveSelection = () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
          savedRange = sel.getRangeAt(0);
        }
      };
      
      const restoreSelection = () => {
        if (savedRange) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(savedRange);
        }
      };

      editor.addEventListener('mouseup', saveSelection);
      editor.addEventListener('keyup', saveSelection);
      editor.addEventListener('blur', saveSelection);

      toolbarButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          editor.focus();
          restoreSelection();

          const cmd = btn.dataset.command;
          const val = btn.dataset.value || null;

          if (cmd === 'insertLevelTag') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const levelBlock = range.startContainer.parentNode.closest('.level-start, .level-end');
                if (levelBlock) {
                    const newRange = document.createRange();
                    newRange.setStartAfter(levelBlock);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }
            const tag = val === 'start' ? 'start' : 'end';
            const cls = tag === 'start' ? 'level-start' : 'level-end';
            const lbl = tag === 'start' ? 'CONTENU DÉBUT DE NIVEAU' : 'CONTENU FIN DE NIVEAU';
            let html = `
              <div class='${cls}'>
                <div class='level-tag-header' contenteditable="false">
                  <span>${lbl}</span>
                  <button type="button" class="delete-level-block-btn" title="Supprimer ce bloc">&times;</button>
                </div>
                <div class='level-tag-content' contenteditable='true'><p>Écrivez ici…</p></div>
              </div>`;
            if (val === 'end') {
              html = '<p><br></p>' + html;
            }
            document.execCommand('insertHTML', false, html);
          } else if (cmd === 'createLink') {
            const url = prompt('Enter the link URL:');
            if (url) {
              document.execCommand(cmd, false, url);
            }
          } else {
            document.execCommand(cmd, false, val);
          }

          this.isDirty = true;
          saveSelection();
        });
      });

      const ensureTrailingParagraph = () => {
        const lastElement = editor.lastElementChild;
        if (!lastElement || lastElement.tagName !== 'P' || lastElement.closest('.level-start, .level-end')) {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          editor.appendChild(p);
        }
      };
      const observer = new MutationObserver(() => ensureTrailingParagraph());
      const config = { childList: true };
      observer.observe(editor, config);
      ensureTrailingParagraph();

      editor.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-level-block-btn')) {
          const blockToDelete = event.target.closest('.level-start, .level-end');
          if (blockToDelete) {
            blockToDelete.remove();
            this.isDirty = true;
          }
        }
      });

      const insertBtn = document.querySelector('.insert-image-btn');
      const modal = this.imageModal;
      const urlInput = modal.querySelector('#image-url-input');
      const altInput = modal.querySelector('#image-alt-input');
      const closeBtn = modal.querySelector('.close-image-modal');
      const confirmBtn = modal.querySelector('#confirm-image-insert');
      insertBtn.addEventListener('click', () => {
        saveSelection();
        urlInput.value = '';
        altInput.value = '';
        modal.style.display = 'flex';
        urlInput.focus();
      });
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.style.display = 'none';
      });
      confirmBtn.addEventListener('click', () => {
        const fileName = urlInput.value.trim();
        if (!fileName) {
          alert('Veuillez fournir le nom du fichier image.');
          return urlInput.focus();
        }
        const altText = altInput.value.trim();
        const src = IMAGESFOLDER + fileName;
        modal.style.display = 'none';
        editor.focus();
        restoreSelection();
        this.isDirty = true;
        const imgHtml = `<img src='${src}' alt='${altText}' style='max-width:100%;height:auto;'>`;
        document.execCommand('insertHTML', false, imgHtml);
      });
    },

    toggleCourseEditor() {
      const panel = document.getElementById('course-editor-panel');
      if (!panel) return;
      const showing = panel.style.display === 'block';
      panel.style.display = showing ? 'none' : 'block';
      if (!showing) {
        this.loadCurrentCourseContent();
        this.isDirty = false;
      }
    },

    loadCurrentCourseContent() {
      const cc = window.cy?.courseContent ?? null;
      if (!cc) {
        if (this.titleInput) this.titleInput.value = '';
        if (this.richTextEditor) this.richTextEditor.innerHTML = '';
        return;
      }
      this.titleInput.value = cc.title || '';
      this.richTextEditor.innerHTML = cc.content || '';
    },

    getCourseContent() {
        if (!this.titleInput || !this.richTextEditor) return null;
        
        const editorClone = this.richTextEditor.cloneNode(true);
        
        const lastElement = editorClone.lastElementChild;
        if (lastElement && lastElement.tagName === 'P' && (lastElement.innerHTML.trim() === '' || lastElement.innerHTML.trim() === '<br>')) {
            lastElement.remove();
        }
        
        editorClone.querySelectorAll('.level-start, .level-end').forEach(levelTag => {
            const header = levelTag.querySelector('.level-tag-header');
            if(header) {
              const deleteBtn = header.querySelector('.delete-level-block-btn');
              if(deleteBtn) deleteBtn.remove();
            }

            const contentContainer = levelTag.querySelector('.level-tag-content');
            if (!contentContainer) return;
    
            let combinedHtml = '';
            const allContentDivs = levelTag.querySelectorAll('.level-tag-content');
            
            allContentDivs.forEach(div => {
                const inner = div.innerHTML.trim();
                if (inner && inner !== 'Écrivez ici…' && inner !== '<br>') {
                    if (inner.startsWith('<p>') && inner.endsWith('</p>')) {
                        combinedHtml += inner;
                    } else {
                        combinedHtml += `<p>${inner}</p>`;
                    }
                }
            });
    
            const headerHTML = levelTag.querySelector('.level-tag-header').outerHTML;
            levelTag.innerHTML = `${headerHTML}<div class="level-tag-content">${combinedHtml}</div>`;
        });
        
        const cleanedContent = editorClone.innerHTML.trim();
  
        return {
            title: this.titleInput.value.trim(),
            content: cleanedContent
        };
    },

    previewCourse() {
      const content = this.getCourseContent();
      if (!content) {
        alert('Failed to get course content. Please check your inputs.');
        return;
      }
      this.showPreviewPopup(content);
    },

    showPreviewPopup(content) {
      document.querySelector('.course-popup-overlay')?.remove();
      const overlay = document.createElement('div');
      overlay.className = 'course-popup-overlay';
      const container = document.createElement('div');
      container.className = 'course-popup-container';
      const header = document.createElement('div');
      header.className = 'course-popup-header';
      const titleEl = document.createElement('div');
      titleEl.className = 'course-popup-title';
      titleEl.textContent = content.title || 'Course Preview';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'course-popup-close';
      closeBtn.innerHTML = '&times;';
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          overlay.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      closeBtn.addEventListener('click', () => {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      });
      header.appendChild(titleEl);
      header.appendChild(closeBtn);
      container.appendChild(header);
      const body = document.createElement('div');
      body.className = 'course-popup-content';
      body.innerHTML = content.content || '<p><em>No content available.</em></p>';
      container.appendChild(body);
      overlay.appendChild(container);
      document.body.appendChild(overlay);
      document.addEventListener('keydown', escHandler);
    },

    saveCourseContent() {
      const content = this.getCourseContent();
      if (!content) {
        alert('Failed to get course content. Please check your inputs.');
        return;
      }
      if (!content.title) {
        alert('Please enter a title for the course content.');
        this.titleInput.focus();
        return;
      }
      if (!window.cy) {
        alert('Cannot save course content: Cytoscape not initialized');
        return;
      }

      window.cy.courseContent = content;
      const graphId = window.cy.id;

      if (graphId && window.graphPersistence?.updateCourseContent) {
        window.graphPersistence.updateCourseContent(graphId, content)
          .then(result => {
            if (result.success) {
              alert('Course content saved successfully to the database!');
            } else {
              alert(`Failed to save course content: ${result.message}\nRemember to save the graph to persist changes.`);
            }
          })
          .catch(err => {
            console.error('Error saving course content:', err);
            alert(`Error saving course content: ${err.message}\nRemember to save the graph to persist changes.`);
          });
      } else if (window.graphPersistence?.saveGraph) {
        if (confirm('Course content saved to memory. Would you like to save the entire graph now?')) {
          const name = window.cy.graphName
            || prompt('Enter a name for this graph:', `Graph_${new Date().toISOString().slice(0,10)}`);
          if (name) {
            window.graphPersistence.saveGraph(name)
              .then(result => {
                if (result.success) {
                  alert('Graph saved with course content successfully!');
                } else {
                  alert(`Failed to save graph: ${result.message}`);
                }
              })
              .catch(err => {
                console.error('Error saving graph:', err);
                alert(`Error saving graph: ${err.message}`);
              });
          }
        } else {
          alert('Course content saved in memory! Remember to save the graph to persist changes.');
        }
      } else {
        alert('Course content saved in memory! Remember to save the graph to persist changes.');
      }
      this.isDirty = false;
    }
  };

  document.getElementById('editorModeBtn')?.addEventListener('click', () => {
    setTimeout(() => window.courseEditor.init(), 500);
  });
});