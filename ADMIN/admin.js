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

    // --- INITIALIZATION ---
    firebase.initializeApp(firebaseConfig);
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

    // --- AUTHENTICATION ---
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
                // If not an admin, check if they are an intern in the users collection
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

        // Role-based UI adjustments
        const blogTabs = document.querySelectorAll('.blog-tab-link');
        if (userRole === 'intern') {
            blogTabs.forEach(tab => {
                const target = tab.getAttribute('data-target');
                if (target !== 'create-edit' && target !== 'drafts-revisions') {
                    tab.style.display = 'none';
                }
            });
        } else {
            blogTabs.forEach(tab => {
                tab.style.display = 'inline-block';
            });
        }
    }

    function logActivity(message) {
        firestoreDb.collection('logs').add({ message, timestamp: firebase.firestore.FieldValue.serverTimestamp(), admin: auth.currentUser.email });
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

    // --- MODULE LOADERS ---
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

        // Handle form submission
        if (!blogFormListenerAttached) {
            const postForm = document.getElementById('post-form');
            postForm.addEventListener('submit', e => {
                e.preventDefault();
                const submitButton = postForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = 'Saving...';

                const title = document.getElementById('post-title').value.trim();
                const content = quill.getText().trim();

                if (!title || content.length === 0) {
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

                const savePost = (imageUrl) => {
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

                    promise.then(() => {
                        postForm.reset();
                        quill.setText('');
                        alert('Post saved successfully!');
                    }).catch(error => {
                        console.error("Error saving post:", error);
                        alert('There was an error saving the post.');
                    }).finally(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Save Post';
                    });
                }

                if (imageFile) {
                    const storageRef = storage.ref('blog-images/' + Date.now() + '-' + imageFile.name);
                    storageRef.put(imageFile).then(snapshot => {
                        snapshot.ref.getDownloadURL().then(downloadURL => {
                            savePost(downloadURL);
                        });
                    }).catch(error => {
                        console.error("Error uploading image:", error);
                        alert('There was an error uploading the image.');
                        submitButton.disabled = false;
                        submitButton.textContent = 'Save Post';
                    });
                } else {
                    savePost(null);
                }
            });
            blogFormListenerAttached = true;
        }

        // SEO Analysis
        const analyzeSeoBtn = document.getElementById('analyze-seo-btn');
        analyzeSeoBtn.addEventListener('click', () => {
            const text = quill.getText();
            const options = {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY', // Replace with your RapidAPI key
                    'X-RapidAPI-Host': 'text-analysis12.p.rapidapi.com' // Replace with the correct host
                },
                body: JSON.stringify({ text: text, language: 'english' })
            };

            fetch('https://text-analysis12.p.rapidapi.com/keyword-extraction/api/v1.1', options)
                .then(response => response.json())
                .then(response => {
                    const seoResults = document.getElementById('seo-results');
                    seoResults.innerHTML = '<h3>Keywords:</h3>';
                    const list = document.createElement('ul');
                    response.keywords.forEach(keyword => {
                        const item = document.createElement('li');
                        item.textContent = keyword;
                        list.appendChild(item);
                    });
                    seoResults.appendChild(list);
                })
                .catch(err => console.error(err));
        });

        // Keyword Suggestions
        const getSuggestionsBtn = document.getElementById('get-suggestions-btn');
        getSuggestionsBtn.addEventListener('click', () => {
            const keyword = document.getElementById('seed-keyword').value;
            // Replace with your keyword suggestion API endpoint and key
            const options = {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY',
                    'X-RapidAPI-Host': 'your-keyword-api-host.p.rapidapi.com'
                }
            };

            fetch(`https://your-keyword-api-host.p.rapidapi.com/suggestions?keyword=${keyword}`, options)
                .then(response => response.json())
                .then(response => {
                    const suggestionsContainer = document.getElementById('keyword-suggestions');
                    suggestionsContainer.innerHTML = '<h3>Suggestions:</h3>';
                    const list = document.createElement('ul');
                    response.suggestions.forEach(suggestion => {
                        const item = document.createElement('li');
                        item.textContent = suggestion;
                        list.appendChild(item);
                    });
                    suggestionsContainer.appendChild(list);
                })
                .catch(err => console.error(err));
        });

        // Meta Snippet Preview
        const postTitleInput = document.getElementById('post-title');
        const metaDescriptionInput = document.getElementById('meta-description');
        const googleTitle = document.getElementById('google-title');
        const googleDesc = document.getElementById('google-desc');
        const googleUrl = document.getElementById('google-url');

        postTitleInput.addEventListener('input', () => {
            googleTitle.textContent = postTitleInput.value;
            googleUrl.textContent = `https://studycubs.com/blog/${postTitleInput.value.toLowerCase().replace(/\s+/g, '-')}`;
        });

        metaDescriptionInput.addEventListener('input', () => {
            googleDesc.textContent = metaDescriptionInput.value;
        });
    }

    function loadBlogSettings() {
        const addCategoryBtn = document.getElementById('add-category-btn');
        const newCategoryInput = document.getElementById('new-category');
        const categoryList = document.getElementById('category-list');
        const postCategoryDatalist = document.createElement('datalist');
        postCategoryDatalist.id = 'post-categories';
        document.body.appendChild(postCategoryDatalist);
        const postCategoryInput = document.getElementById('post-category');
        postCategoryInput.setAttribute('list', 'post-categories');

        const categoriesRef = firestoreDb.collection('blog_categories');

        addCategoryBtn.addEventListener('click', () => {
            const newCategory = newCategoryInput.value.trim();
            if (newCategory) {
                categoriesRef.add({ name: newCategory });
                newCategoryInput.value = '';
            }
        });

        categoriesRef.onSnapshot(snapshot => {
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
        assignRoleBtn.addEventListener('click', () => {
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
        firestoreDb.collection('blogs').where('status', '==', 'published').onSnapshot(snapshot => {
            const postsTbody = document.getElementById('published-posts-tbody');
            postsTbody.innerHTML = '';
            snapshot.forEach(doc => {
                const post = doc.data();
                const postRow = document.createElement('tr');
                postRow.innerHTML = `
                    <td>
                        ${post.featuredImage ? `<img src="${post.featuredImage}" width="100">` : ''}
                        ${post.title}
                    </td>
                    <td>${post.category}</td>
                    <td>${post.authorName}</td>
                    <td>${post.status}</td>
                    <td>
                        <button onclick="editPublishedPost('${doc.id}')">Edit</button>
                        <button onclick="deletePublishedPost('${doc.id}')">Delete</button>
                    </td>
                `;
                postsTbody.appendChild(postRow);
            });
        });
    }

    function loadMyDrafts() {
        const user = auth.currentUser;
        firestoreDb.collection('drafts').where('authorId', '==', user.uid).onSnapshot(snapshot => {
            const draftsTbody = document.getElementById('drafts-tbody');
            draftsTbody.innerHTML = '';
            snapshot.forEach(doc => {
                const draft = doc.data();
                const draftRow = document.createElement('tr');
                draftRow.innerHTML = `
                    <td>${draft.title}</td>
                    <td>${draft.category}</td>
                    <td>${draft.authorName}</td>
                    <td>
                        <button onclick="editDraft('${doc.id}')">Edit</button>
                        <button onclick="submitForReview('${doc.id}')">Submit for Review</button>
                    </td>
                `;
                draftsTbody.appendChild(draftRow);
            });
        });
    }

    function loadAllDrafts() {
        firestoreDb.collection('drafts').onSnapshot(snapshot => {
            const draftsTbody = document.getElementById('drafts-tbody');
            draftsTbody.innerHTML = '';
            snapshot.forEach(doc => {
                const draft = doc.data();
                const draftRow = document.createElement('tr');
                draftRow.innerHTML = `
                    <td>${draft.title}</td>
                    <td>${draft.category}</td>
                    <td>${draft.authorName}</td>
                    <td>
                        <button onclick="editDraft('${doc.id}')">Edit</button>
                    </td>
                `;
                draftsTbody.appendChild(draftRow);
            });
        });
    }

    function loadInternSubmissions() {
        firestoreDb.collection('submissions').onSnapshot(snapshot => {
            const submissionsTbody = document.getElementById('intern-submissions-tbody');
            submissionsTbody.innerHTML = '';
            snapshot.forEach(doc => {
                const submission = doc.data();
                const submissionRow = document.createElement('tr');
                submissionRow.innerHTML = `
                    <td>${submission.title}</td>
                    <td>${submission.category}</td>
                    <td>${submission.authorName}</td>
                    <td>
                        <button onclick="approveSubmission('${doc.id}')">Approve</button>
                        <button onclick="rejectSubmission('${doc.id}')">Reject</button>
                    </td>
                `;
                submissionsTbody.appendChild(submissionRow);
            });
        });
    }

    window.editDraft = function(id) {
        firestoreDb.collection('drafts').doc(id).get().then(doc => {
            if (doc.exists) {
                const post = doc.data();
                document.getElementById('post-id').value = doc.id;
                document.getElementById('post-title').value = post.title;
                quill.root.innerHTML = post.content;
                document.getElementById('post-category').value = post.category;
                document.getElementById('meta-description').value = post.metaDescription;
                document.getElementById('keywords').value = post.keywords;

                // Switch to the create/edit tab
                document.querySelector('.blog-tab-link[data-target="create-edit"]').click();
            }
        });
    }

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
    }

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
    }

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
    }

    window.editPublishedPost = function(id) {
        firestoreDb.collection('blogs').doc(id).get().then(doc => {
            if (doc.exists) {
                const post = doc.data();
                document.getElementById('post-id').value = doc.id;
                document.getElementById('post-title').value = post.title;
                quill.root.innerHTML = post.content;
                document.getElementById('post-category').value = post.category;
                document.getElementById('meta-description').value = post.metaDescription;
                document.getElementById('keywords').value = post.keywords;

                // Switch to the create/edit tab
                document.querySelector('.blog-tab-link[data-target="create-edit"]').click();
            }
        });
    }

    window.deletePublishedPost = function(id) {
        if (confirm('Are you sure you want to delete this post?')) {
            firestoreDb.collection('blogs').doc(id).delete();
        }
    }

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
            logsContainer.innerHTML = '';
            snap.forEach(doc => {
                const log = doc.data();
                logsContainer.innerHTML += `<div class="log-entry">${new Date(log.timestamp.toDate()).toLocaleString()} - ${log.message}</div>`;
            });
        }));

        const assignRoleBtn = document.getElementById('assign-role-btn');
        assignRoleBtn.addEventListener('click', () => {
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
        tbody.innerHTML = '';
        docs.forEach(doc => tbody.innerHTML += rowRenderer(doc));
    }

    function renderUserRow(doc) { const user = doc.data(); return `<tr><td>${doc.id}</td><td>${user.name || 'N/A'}</td><td>${user.email}</td><td>${user.role || 'N/A'}</td><td><button data-uid="${doc.id}" class="make-admin-btn">Make Admin</button></td></tr>`; }
    function renderCourseRow(doc) { const course = doc.data(); return `<tr><td>${course.title}</td><td>${course.category}</td><td>${course.status}</td><td><button data-id="${doc.id}" class="toggle-status-btn">Toggle</button><button data-id="${doc.id}" class="delete-btn">Delete</button></td></tr>`; }
    function renderResourceRow(doc) { const resource = doc.data(); return `<tr><td>${resource.title}</td><td>${resource.subject}</td><td><a href="${resource.url}" target="_blank">Link</a></td><td><button data-id="${doc.id}" class="delete-btn">Delete</button></td></tr>`; }
    function renderPodcastRow(doc) { const podcast = doc.data(); return `<tr><td>${podcast.name}</td><td>${podcast.speaker}</td><td>${podcast.status}</td><td><button data-id="${doc.id}" class="toggle-status-btn">Toggle</button><button data-id="${doc.id}" class="delete-btn">Delete</button></td></tr>`; }
    function renderWebinarRow(doc) { const webinar = doc.data(); return `<tr><td>${webinar.title}</td><td>${webinar.date}</td><td>${webinar.speaker}</td><td><a href="${webinar.link}" target="_blank">Link</a></td><td><button data-id="${doc.id}" class="edit-btn">Edit</button><button data-id="${doc.id}" class="delete-btn">Delete</button></td></tr>`; }
    
    // --- EVENT HANDLERS ---
    document.getElementById('login-btn').addEventListener('click', () => auth.signInWithEmailAndPassword(document.getElementById('admin-email').value, document.getElementById('admin-password').value).catch(err => document.getElementById('login-error').textContent = err.message));
    
    const mainContent = document.querySelector('.main-content');
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
});
