// admin.js (complete - drop in to replace current admin.js)
// NOTE: backup your current admin.js before replacing.

document.addEventListener('DOMContentLoaded', function () {
    const firebaseConfig = {
        apiKey: "AIzaSyC4YZeG_t60GX_9EFfMZ9jFDCsLUHbnbz8",
        authDomain: "studycubs-official.firebaseapp.com",
        databaseURL: "https://studycubs-official-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "studycubs-official",
        storageBucket: "studycubs-official.firebasestorage.app",
        messagingSenderId: "328675454729",
        appId: "1:328675454729:web:11ed5ab9607c0e4590edd8",
        measurementId: "G-EWPM4HZ7QP"
    };

    // -------------------------
    // === GITHUB CONFIG (edit) ===
    // -------------------------
    const GITHUB_USERNAME = "arsalanwebscrapper"; // replace if needed
    const GITHUB_REPO = "stdcub";               // replace if needed
    const GITHUB_BRANCH = "main";               // branch to commit to
    const GITHUB_TOKEN = "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"; // ⚠️ client token is insecure

    // -------------------------
    // === Firebase init (guarded) ===
    // -------------------------
    if (!window.firebase) {
        console.error('Firebase SDK not loaded! Make sure firebase scripts are included in admin.html');
        return;
    }
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // --- INITIALIZATION ---
    const auth = firebase.auth();
    const firestoreDb = firebase.firestore();
    const storage = firebase.storage();

    // --- PAGE ELEMENTS & STATE ---
    const loginPage = document.getElementById('admin-login');
    const dashboardPage = document.getElementById('admin-dashboard');
    const navLinks = document.querySelectorAll('.nav-link');
    const modules = document.querySelectorAll('.module');
    let unsubscribes = [];
    let quill;
    let userRole = null;
    let blogFormListenerAttached = false;

    // -------------------------
    // === Static HTML generator ===
    // -------------------------
    function generateStaticHTML(title, author, content, image, dateIso) {
      // sanitize minimal - for better security use server-side templates
      const date = new Date(dateIso);
      const safeTitle = title || 'Untitled';
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeTitle} by ${author || 'StudyCubs'}" />
  <link rel="stylesheet" href="/css/blog-style.css" />
</head>
<body>
  <header class="blog-header">
    <h1>${safeTitle}</h1>
    <p>By ${author || 'StudyCubs'} • ${date.toLocaleDateString()}</p>
  </header>
  <article class="blog-content">
    ${image ? `<img src="${image}" alt="${safeTitle}" style="width:100%;border-radius:8px;">` : ''}
    ${content}
  </article>
  <footer>
    <p>© ${new Date().getFullYear()} StudyCubs</p>
  </footer>
</body>
</html>`;
    }

    // -------------------------
    // === GitHub upload function ===
    // -------------------------
    async function uploadToGitHub(filePath, htmlContent) {
      // filePath: blogs/slug.html or blogs/whatever.html
      const apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filePath}`;
      const encoded = btoa(unescape(encodeURIComponent(htmlContent))); // safe encode

      // Get existing file to fetch sha for update
      let sha = null;
      try {
        const getRes = await fetch(apiUrl, {
          headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        if (getRes.ok) {
          const data = await getRes.json();
          sha = data.sha;
        }
      } catch (err) {
        console.warn('Could not fetch existing file SHA (may be new):', err);
      }

      const body = {
        message: `Auto-generated blog: ${filePath}`,
        content: encoded,
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {})
      };

      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`GitHub upload failed: ${res.status} ${errTxt}`);
      }

      const resJson = await res.json();
      return resJson;
    }

    // -------------------------
    // === Add dynamic local .html uploader (no admin.html edits required) ===
    // -------------------------
    function attachLocalHtmlUploader() {
      // create uploader only once
      if (document.getElementById('local-html-uploader')) return;

      const createEditTab = document.getElementById('create-edit');
      if (!createEditTab) return;

      const wrapper = document.createElement('div');
      wrapper.id = 'local-html-uploader';
      wrapper.style.marginTop = '12px';
      wrapper.innerHTML = `
        <h3>Upload local .html (publish to GitHub)</h3>
        <input type="file" id="local-html-file" accept=".html" />
        <input type="text" id="local-html-filename" placeholder="(optional) filename e.g. my-post.html" />
        <button id="local-html-upload-btn">Upload to GitHub</button>
        <span id="local-html-upload-status" style="margin-left:10px;"></span>
      `;
      createEditTab.appendChild(wrapper);

      const fileInput = document.getElementById('local-html-file');
      const nameInput = document.getElementById('local-html-filename');
      const uploadBtn = document.getElementById('local-html-upload-btn');
      const statusEl = document.getElementById('local-html-upload-status');

      uploadBtn.addEventListener('click', async () => {
        statusEl.textContent = '';
        if (!fileInput.files.length) {
          alert('Choose an .html file first.');
          return;
        }
        const f = fileInput.files[0];
        if (!f.name.endsWith('.html')) {
          alert('Please upload a file with .html extension.');
          return;
        }
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const content = ev.target.result;
          // determine filename
          let fileName = nameInput.value.trim() || f.name;
          fileName = fileName.toLowerCase().replace(/\s+/g, '-');
          if (!fileName.endsWith('.html')) fileName += '.html';
          const path = `blogs/${fileName}`;
          statusEl.textContent = 'Uploading...';
          try {
            await uploadToGitHub(path, content);
            statusEl.innerHTML = `<span style="color:green">✔ Uploaded as /${path}</span>`;
          } catch (err) {
            console.error(err);
            statusEl.innerHTML = `<span style="color:crimson">✖ Upload failed (see console)</span>`;
            alert('Upload failed: ' + (err && err.message ? err.message : 'unknown'));
          }
        };
        reader.readAsText(f, 'utf-8');
      });
    }

    // attach uploader when DOM ready
    attachLocalHtmlUploader();

    // -------------------------
    // === AUTHENTICATION ===
    // -------------------------
    auth.onAuthStateChanged(user => {
        if (user) {
            checkUserRole(user);
        } else {
            showLoginPage();
            unsubscribes.forEach(unsub => unsub());
            unsubscribes = [];
        }
    });

    function checkUserRole(user) {
        const adminDocRef = firestoreDb.collection('admins').doc(user.uid);
        adminDocRef.get().then(adminDoc => {
            if (adminDoc.exists && adminDoc.data().isAdmin === true) {
                userRole = 'admin';
                showDashboard();
            } else {
                const userDocRef = firestoreDb.collection('users').doc(user.uid);
                userDocRef.get().then(userDoc => {
                    if (userDoc.exists && userDoc.data().role === 'intern') {
                        userRole = 'intern';
                        showDashboard();
                    } else {
                        alert('You are not authorized to access this page.');
                        auth.signOut();
                    }
                }).catch(error => {
                    console.error("Error getting user role:", error);
                    alert('Error getting user role. Please try again.');
                    auth.signOut();
                });
            }
        }).catch(error => {
            console.error("Error checking admin status:", error);
            alert('Error checking admin status. Please try again.');
            auth.signOut();
        });
    }

    function showLoginPage() {
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
    }

    function showDashboard() {
        loginPage.style.display = 'none';
        dashboardPage.style.display = 'flex';
        loadHomeModule();

        const blogTabs = document.querySelectorAll('.blog-tab-link');
        if (userRole === 'intern') {
            blogTabs.forEach(tab => {
                const target = tab.getAttribute('data-target');
                if (target !== 'create-edit' && target !== 'drafts-revisions') {
                    tab.style.display = 'none';
                }
            });
        } else {
            blogTabs.forEach(tab => tab.style.display = 'inline-block');
        }
    }

    function logActivity(message) {
        try {
          firestoreDb.collection('logs').add({ message, timestamp: firebase.firestore.FieldValue.serverTimestamp(), admin: auth.currentUser.email });
        } catch (e) { console.warn('Log failed', e); }
    }

    // --- NAVIGATION ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const target = link.getAttribute('data-target');
            modules.forEach(m => m.id === target ? m.classList.add('active') : m.classList.remove('active'));
            
            unsubscribes.forEach(unsub => unsub());
            unsubscribes = [];

            const loader = window.moduleLoaders[target];
            if (loader) loader();
        });
    });

    // --- MODULE LOADERS (unchanged) ---
    window.moduleLoaders = {
        home: loadHomeModule,
        users: loadUsersModule,
        courses: loadCoursesModule,
        resources: loadResourcesModule,
        blog: loadBlogModule,
        podcasts: loadPodcastsModule,
        webinars: loadWebinarsModule,
        settings: loadSettingsModule
    };

    function loadHomeModule() {
        const counts = { users: 'users-count', courses: 'courses-count', blogs: 'blogs-count', podcasts: 'podcasts-count' };
        Object.keys(counts).forEach(col => {
            unsubscribes.push(firestoreDb.collection(col).onSnapshot(snap => document.getElementById(counts[col]).textContent = snap.size));
        });
    }

    function loadUsersModule() {
        unsubscribes.push(firestoreDb.collection('users').onSnapshot(snap => renderTable(snap.docs, 'users-table-body', renderUserRow)));
    }

    function loadCoursesModule() {
        unsubscribes.push(firestoreDb.collection('courses').onSnapshot(snap => renderTable(snap.docs, 'courses-table-body', renderCourseRow)));
    }

    function loadResourcesModule() {
        unsubscribes.push(firestoreDb.collection('resources').onSnapshot(snap => renderTable(snap.docs, 'resources-table-body', renderResourceRow)));
    }

    function loadBlogModule() {
        // Initialize Quill editor
        if (!quill) {
            quill = new Quill('#editor-container', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        ['link', 'image', 'code-block']
                    ]
                }
            });
        }

        // Tab switching logic
        const blogTabs = document.querySelectorAll('.blog-tab-link');
        const blogTabContents = document.querySelectorAll('.blog-tab-content');

        blogTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                blogTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.getAttribute('data-target');
                blogTabContents.forEach(c => c.id === target ? c.classList.add('active') : c.classList.remove('active'));
            });
        });

        // Load data based on role
        if (userRole === 'admin') {
            loadPublishedBlogs();
            loadInternSubmissions();
            loadAllDrafts();
        } else if (userRole === 'intern') {
            loadMyDrafts();
        }

        loadBlogSettings();

        // Handle form submission - modified to include GitHub upload for admins
        if (!blogFormListenerAttached) {
            const postForm = document.getElementById('post-form');
            postForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitButton = postForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = 'Saving...';

                const title = document.getElementById('post-title').value.trim();
                const contentText = quill.getText().trim();

                if (!title || contentText.length === 0) {
                    alert('Title and content cannot be empty.');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Save Post';
                    return;
                }

                const id = document.getElementById('post-id').value;
                const user = auth.currentUser;
                const imageFile = document.getElementById('featured-image').files[0];

                const postData = {
                    title: title,
                    content: quill.root.innerHTML,
                    category: document.getElementById('post-category').value,
                    metaDescription: document.getElementById('meta-description').value,
                    keywords: document.getElementById('keywords').value,
                    lastSaved: new Date().toISOString(),
                    authorId: user.uid,
                    authorName: user.displayName || user.email,
                };

                const savePost = async (imageUrl) => {
                    if (imageUrl) {
                        postData.featuredImage = imageUrl;
                    }

                    let promise;
                    if (userRole === 'admin') {
                        postData.status = 'published';
                        if (id) {
                            promise = firestoreDb.collection('blogs').doc(id).set(postData, { merge: true });
                        } else {
                            promise = firestoreDb.collection('blogs').add(postData);
                        }
                    } else { // Intern
                        postData.status = 'draft';
                        if (id) {
                            promise = firestoreDb.collection('drafts').doc(id).set(postData, { merge: true });
                        } else {
                            promise = firestoreDb.collection('drafts').add(postData);
                        }
                    }

                    try {
                        const writeResult = await promise;
                        postForm.reset();
                        quill.setText('');
                        alert('Post saved successfully!');

                        // If admin published, also generate static HTML and upload to GitHub
                        if (userRole === 'admin' && postData.status === 'published') {
                            try {
                                const slug = title.replace(/\s+/g, '-').toLowerCase();
                                const fileName = `${slug}.html`;
                                const htmlContent = generateStaticHTML(title, postData.authorName, postData.content, postData.featuredImage || '', new Date().toISOString());
                                const path = `blogs/${fileName}`;
                                await uploadToGitHub(path, htmlContent);
                                alert(`✅ Blog uploaded to GitHub: /${path}`);
                                // Optionally log commit url
                            } catch (err) {
                                console.error('Upload to GitHub failed', err);
                                alert('⚠️ Blog saved but GitHub upload failed — check console for error.');
                            }
                        }
                    } catch (err) {
                        console.error("Error saving post:", err);
                        alert('There was an error saving the post.');
                    } finally {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Save Post';
                    }
                };

                // upload image if present
                if (imageFile) {
                    try {
                        const storageRef = storage.ref('blog-images/' + Date.now() + '-' + imageFile.name);
                        const snapshot = await storageRef.put(imageFile);
                        const downloadURL = await snapshot.ref.getDownloadURL();
                        await savePost(downloadURL);
                    } catch (err) {
                        console.error("Error uploading image:", err);
                        alert('There was an error uploading the image.');
                        submitButton.disabled = false;
                        submitButton.textContent = 'Save Post';
                    }
                } else {
                    await savePost(null);
                }
            });
            blogFormListenerAttached = true;
        }

        // ensure local uploader present inside create-edit
        attachLocalHtmlUploader();
    }

    // --- SEO, keywords, preview pieces untouched (copied from your original) ---
    // (I kept original SEO button handler and keyword suggestions from your supplied script)
    // If those functions are missing or use placeholder RapidAPI keys, they still won't break anything.

    // SEO Analysis
    const analyzeSeoBtn = document.getElementById('analyze-seo-btn');
    if (analyzeSeoBtn) {
      analyzeSeoBtn.addEventListener('click', () => {
        const text = quill ? quill.getText() : '';
        const options = {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY', // Replace
                'X-RapidAPI-Host': 'text-analysis12.p.rapidapi.com'
            },
            body: JSON.stringify({ text: text, language: 'english' })
        };

        fetch('https://text-analysis12.p.rapidapi.com/keyword-extraction/api/v1.1', options)
            .then(response => response.json())
            .then(response => {
                const seoResults = document.getElementById('seo-results');
                if (!seoResults) return;
                seoResults.innerHTML = '<h3>Keywords:</h3>';
                const list = document.createElement('ul');
                (response.keywords || []).forEach(keyword => {
                    const item = document.createElement('li');
                    item.textContent = keyword;
                    list.appendChild(item);
                });
                seoResults.appendChild(list);
            })
            .catch(err => console.error(err));
      });
    }

    // The rest of your original module functions are preserved below exactly (loadBlogSettings, loadPublishedBlogs, loadMyDrafts, loadAllDrafts, loadInternSubmissions, and
    // other window.* functions like editDraft, approveSubmission, etc.)
    // I'll re-attach them as-is so nothing breaks.

    function loadBlogSettings() {
        const addCategoryBtn = document.getElementById('add-category-btn');
        const newCategoryInput = document.getElementById('new-category');
        const categoryList = document.getElementById('category-list');
        const postCategoryDatalist = document.createElement('datalist');
        postCategoryDatalist.id = 'post-categories';
        document.body.appendChild(postCategoryDatalist);
        const postCategoryInput = document.getElementById('post-category');
        if (postCategoryInput) postCategoryInput.setAttribute('list', 'post-categories');

        const categoriesRef = firestoreDb.collection('blog_categories');

        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => {
            const newCategory = newCategoryInput.value.trim();
            if (newCategory) {
                categoriesRef.add({ name: newCategory });
                newCategoryInput.value = '';
            }
        });

        categoriesRef.onSnapshot(snapshot => {
            if (!categoryList) return;
            categoryList.innerHTML = '';
            postCategoryDatalist.innerHTML = '';
            snapshot.forEach(doc => {
                const category = doc.data();
                const li = document.createElement('li');
                li.textContent = category.name;
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => {
                    categoriesRef.doc(doc.id).delete();
                };
                li.appendChild(deleteBtn);
                categoryList.appendChild(li);

                const option = document.createElement('option');
                option.value = category.name;
                postCategoryDatalist.appendChild(option);
            });
        });

        const assignRoleBtn = document.getElementById('blog-assign-role-btn');
        if (assignRoleBtn) assignRoleBtn.addEventListener('click', () => {
            const email = document.getElementById('blog-user-email-for-role').value;
            const role = document.getElementById('blog-user-role').value;
            if (email && role) {
                firestoreDb.collection('users').where('email', '==', email).get()
                    .then(querySnapshot => {
                        if (!querySnapshot.empty) {
                            const userDoc = querySnapshot.docs[0];
                            firestoreDb.collection('users').doc(userDoc.id).update({ role: role });
                            alert(`Role '${role}' assigned to ${email}`);
                        } else {
                            alert('User not found');
                        }
                    })
                    .catch(error => {
                        console.error("Error assigning role: ", error);
                    });
            }
        });
    }

    function loadPublishedBlogs() {
        unsubscribes.push(firestoreDb.collection('blogs').where('status', '==', 'published').onSnapshot(snapshot => {
            const postsTbody = document.getElementById('published-posts-tbody');
            if (!postsTbody) return;
            postsTbody.innerHTML = '';
            snapshot.forEach(doc => {
                const post = doc.data();
                const postRow = document.createElement('tr');
                postRow.innerHTML = `
                    <td>
                        ${post.featuredImage ? `<img src="${post.featuredImage}" width="100">` : ''}
                        ${post.title}
                    </td>
                    <td>${post.category || ''}</td>
                    <td>${post.authorName || ''}</td>
                    <td>${post.status || ''}</td>
                    <td>
                        <button onclick="editPublishedPost('${doc.id}')">Edit</button>
                        <button onclick="deletePublishedPost('${doc.id}')">Delete</button>
                    </td>
                `;
                postsTbody.appendChild(postRow);
            });
        }));
    }

    function loadMyDrafts() {
        const user = auth.currentUser;
        if (!user) return;
        unsubscribes.push(firestoreDb.collection('drafts').where('authorId', '==', user.uid).onSnapshot(snapshot => {
            const draftsTbody = document.getElementById('drafts-tbody');
            if (!draftsTbody) return;
            draftsTbody.innerHTML = '';
            snapshot.forEach(doc => {
                const draft = doc.data();
                const draftRow = document.createElement('tr');
                draftRow.innerHTML = `
                    <td>${draft.title}</td>
                    <td>${draft.category || ''}</td>
                    <td>${draft.authorName || ''}</td>
                    <td>
                        <button onclick="editDraft('${doc.id}')">Edit</button>
                        <button onclick="submitForReview('${doc.id}')">Submit for Review</button>
                    </td>
                `;
                draftsTbody.appendChild(draftRow);
            });
        }));
    }

    function loadAllDrafts() {
        unsubscribes.push(firestoreDb.collection('drafts').onSnapshot(snapshot => {
            const draftsTbody = document.getElementById('drafts-tbody');
            if (!draftsTbody) return;
            draftsTbody.innerHTML = '';
            snapshot.forEach(doc => {
                const draft = doc.data();
                const draftRow = document.createElement('tr');
                draftRow.innerHTML = `
                    <td>${draft.title}</td>
                    <td>${draft.category || ''}</td>
                    <td>${draft.authorName || ''}</td>
                    <td>
                        <button onclick="editDraft('${doc.id}')">Edit</button>
                    </td>
                `;
                draftsTbody.appendChild(draftRow);
            });
        }));
    }

    function loadInternSubmissions() {
        unsubscribes.push(firestoreDb.collection('submissions').onSnapshot(snapshot => {
            const submissionsTbody = document.getElementById('intern-submissions-tbody');
            if (!submissionsTbody) return;
            submissionsTbody.innerHTML = '';
            snapshot.forEach(doc => {
                const submission = doc.data();
                const submissionRow = document.createElement('tr');
                submissionRow.innerHTML = `
                    <td>${submission.title}</td>
                    <td>${submission.category || ''}</td>
                    <td>${submission.authorName || ''}</td>
                    <td>
                        <button onclick="approveSubmission('${doc.id}')">Approve</button>
                        <button onclick="rejectSubmission('${doc.id}')">Reject</button>
                    </td>
                `;
                submissionsTbody.appendChild(submissionRow);
            });
        }));
    }

    // Window helper functions - preserved as global so buttons with inline onclick still work
    window.editDraft = function(id) {
        firestoreDb.collection('drafts').doc(id).get().then(doc => {
            if (doc.exists) {
                const post = doc.data();
                document.getElementById('post-id').value = doc.id;
                document.getElementById('post-title').value = post.title;
                if (quill) quill.root.innerHTML = post.content;
                document.getElementById('post-category').value = post.category || '';
                document.getElementById('meta-description').value = post.metaDescription || '';
                document.getElementById('keywords').value = post.keywords || '';

                document.querySelector('.blog-tab-link[data-target="create-edit"]').click();
            }
        });
    };

    window.submitForReview = function(id) {
        const draftRef = firestoreDb.collection('drafts').doc(id);
        draftRef.get().then(doc => {
            if (doc.exists) {
                const post = doc.data();
                post.status = 'pending';
                firestoreDb.collection('submissions').doc(id).set(post).then(() => {
                    draftRef.delete();
                });
            }
        });
    };

    window.approveSubmission = function(id) {
        const submissionRef = firestoreDb.collection('submissions').doc(id);
        submissionRef.get().then(doc => {
            if (doc.exists) {
                const post = doc.data();
                post.status = 'published';
                firestoreDb.collection('blogs').doc(id).set(post).then(() => {
                    submissionRef.delete();
                });
            }
        });
    };

    window.rejectSubmission = function(id) {
        const submissionRef = firestoreDb.collection('submissions').doc(id);
        submissionRef.get().then(doc => {
            if (doc.exists) {
                const post = doc.data();
                post.status = 'draft';
                firestoreDb.collection('drafts').doc(id).set(post).then(() => {
                    submissionRef.delete();
                });
            }
        });
    };

    window.editPublishedPost = function(id) {
        firestoreDb.collection('blogs').doc(id).get().then(doc => {
            if (doc.exists) {
                const post = doc.data();
                document.getElementById('post-id').value = doc.id;
                document.getElementById('post-title').value = post.title;
                if (quill) quill.root.innerHTML = post.content;
                document.getElementById('post-category').value = post.category || '';
                document.getElementById('meta-description').value = post.metaDescription || '';
                document.getElementById('keywords').value = post.keywords || '';

                document.querySelector('.blog-tab-link[data-target="create-edit"]').click();
            }
        });
    };

    window.deletePublishedPost = function(id) {
        if (confirm('Are you sure you want to delete this post?')) {
            firestoreDb.collection('blogs').doc(id).delete();
        }
    };

    // ---- Podcasts, webinars and other modules kept intact as you originally had them ----
    function loadPodcastsModule() {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const collectionPath = `artifacts/${appId}/public/data/podcasts`;

        unsubscribes.push(firestoreDb.collection(collectionPath).onSnapshot(snap => {
            const pendingPodcasts = [];
            const publishedPodcasts = [];

            snap.forEach(doc => {
                const podcast = { id: doc.id, ...doc.data() };
                if (podcast.approved) {
                    publishedPodcasts.push(podcast);
                } else {
                    pendingPodcasts.push(podcast);
                }
            });

            renderTable(pendingPodcasts, 'pending-podcasts-table-body', renderPendingPodcastRow);
            renderTable(publishedPodcasts, 'published-podcasts-table-body', renderPublishedPodcastRow);
        }));
    }

    function renderPendingPodcastRow(podcast) {
        const createdAt = podcast.createdAt ? new Date(podcast.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
        return `<tr>
            <td>${podcast.title}</td>
            <td>${podcast.name}</td>
            <td>${podcast.category}</td>
            <td>${createdAt}</td>
            <td><a href="${podcast.audioURL}" target="_blank">Listen</a></td>
            <td>
                <button data-id="${podcast.id}" class="approve-podcast-btn">Approve</button>
                <button data-id="${podcast.id}" class="reject-podcast-btn">Reject</button>
            </td>
        </tr>`;
    }

    function renderPublishedPodcastRow(podcast) {
        const publishedAt = podcast.publishedAt ? new Date(podcast.publishedAt.seconds * 1000).toLocaleDateString() : 'N/A';
        const featureButton = podcast.featured
            ? `<button data-id="${podcast.id}" class="unfeature-podcast-btn">Unfeature</button>`
            : `<button data-id="${podcast.id}" class="feature-podcast-btn">Feature</button>`;

        return `<tr>
            <td>${podcast.title}</td>
            <td>${podcast.name}</td>
            <td>${podcast.category}</td>
            <td>${publishedAt}</td>
            <td><a href="${podcast.audioURL}" target="_blank">Listen</a></td>
            <td>
                <button data-id="${podcast.id}" class="unpublish-podcast-btn">Unpublish</button>
                ${featureButton}
            </td>
        </tr>`;
    }

    function loadWebinarsModule() {
        unsubscribes.push(firestoreDb.collection('webinars').orderBy('date', 'desc').onSnapshot(snap => renderTable(snap.docs, 'webinars-table-body', renderWebinarRow)));
    }

    function loadSettingsModule() {
        unsubscribes.push(firestoreDb.collection('logs').orderBy('timestamp', 'desc').limit(100).onSnapshot(snap => {
            const logsContainer = document.getElementById('activity-logs');
            if (!logsContainer) return;
            logsContainer.innerHTML = '';
            snap.forEach(doc => {
                const log = doc.data();
                if (!log.timestamp) return;
                logsContainer.innerHTML += `<div class="log-entry">${new Date(log.timestamp.toDate()).toLocaleString()} - ${log.message}</div>`;
            });
        }));

        const assignRoleBtn = document.getElementById('assign-role-btn');
        if (assignRoleBtn) assignRoleBtn.addEventListener('click', () => {
            const email = document.getElementById('user-email-for-role').value;
            const role = document.getElementById('user-role').value;
            if (email && role) {
                firestoreDb.collection('users').where('email', '==', email).get()
                    .then(querySnapshot => {
                        if (!querySnapshot.empty) {
                            const userDoc = querySnapshot.docs[0];
                            firestoreDb.collection('users').doc(userDoc.id).update({ role: role });
                            alert(`Role '${role}' assigned to ${email}`);
                        } else {
                            alert('User not found');
                        }
                    })
                    .catch(error => {
                        console.error("Error assigning role: ", error);
                    });
            }
        });
    }

    // --- RENDERERS ---
    function renderTable(docs, tbodyId, rowRenderer) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        tbody.innerHTML = '';
        docs.forEach(doc => tbody.innerHTML += rowRenderer(doc));
    }

    function renderUserRow(doc) { const user = doc.data(); return `<tr><td>${doc.id}</td><td>${user.name || 'N/A'}</td><td>${user.email}</td><td>${user.role || 'N/A'}</td><td><button data-uid="${doc.id}" class="make-admin-btn">Make Admin</button></td></tr>`; }
    function renderCourseRow(doc) { const course = doc.data(); return `<tr><td>${course.title}</td><td>${course.category}</td><td>${course.status}</td><td><button data-id="${doc.id}" class="toggle-status-btn">Toggle</button><button data-id="${doc.id}" class="delete-btn">Delete</button></td></tr>`; }
    function renderResourceRow(doc) { const resource = doc.data(); return `<tr><td>${resource.title}</td><td>${resource.subject}</td><td><a href="${resource.url}" target="_blank">Link</a></td><td><button data-id="${resource.id}" class="delete-btn">Delete</button></td></tr>`; }
    function renderPodcastRow(doc) { const podcast = doc.data(); return `<tr><td>${podcast.name}</td><td>${podcast.speaker}</td><td>${podcast.status}</td><td><button data-id="${podcast.id}" class="toggle-status-btn">Toggle</button><button data-id="${podcast.id}" class="delete-btn">Delete</button></td></tr>`; }
    function renderWebinarRow(doc) { const webinar = doc.data(); return `<tr><td>${webinar.title}</td><td>${webinar.date}</td><td>${webinar.speaker}</td><td><a href="${webinar.link}" target="_blank">Link</a></td><td><button data-id="${webinar.id}" class="edit-btn">Edit</button><button data-id="${webinar.id}" class="delete-btn">Delete</button></td></tr>`; }

    // --- EVENT HANDLERS ---
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', () => {
        const email = document.getElementById('admin-email').value;
        const pass = document.getElementById('admin-password').value;
        auth.signInWithEmailAndPassword(email, pass).catch(err => {
            const errEl = document.getElementById('login-error');
            if (errEl) errEl.textContent = err.message;
        });
    });

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.addEventListener('click', e => {
        const target = e.target;
        const podcastId = target.dataset.id;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const collectionPath = `artifacts/${appId}/public/data/podcasts`;

        if (target.classList.contains('approve-podcast-btn')) {
            if (confirm(`Approve podcast ${podcastId}?`)) {
                firestoreDb.collection(collectionPath).doc(podcastId).update({ 
                    approved: true,
                    publishedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        if (target.classList.contains('reject-podcast-btn')) {
            if (confirm(`Reject and delete podcast ${podcastId}?`)) {
                firestoreDb.collection(collectionPath).doc(podcastId).delete();
            }
        }

        if (target.classList.contains('unpublish-podcast-btn')) {
            if (confirm(`Unpublish podcast ${podcastId}?`)) {
                firestoreDb.collection(collectionPath).doc(podcastId).update({ approved: false });
            }
        }

        if (e.target.classList.contains('make-admin-btn')) {
            const uid = e.target.dataset.uid;
            if (confirm(`Make user ${uid} an admin?`)) {
                firestoreDb.collection('users').doc(uid).update({ role: 'admin' });
                firestoreDb.collection('admins').doc(uid).set({ isAdmin: true });
            }
        }
      });
    }

}); // end DOMContentLoaded
