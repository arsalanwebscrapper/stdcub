// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const firestoreDb = firebase.firestore();
const blogListing = document.getElementById('blog-listing');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchInput = document.getElementById('search-input');

let lastVisible = null;
const pageSize = 6;

function createBlogCard(post, key) {
    const postElement = document.createElement('div');
    postElement.classList.add('col-md-4');
    postElement.innerHTML = `
        <article class="blog-card" id="${key}">
            <img src="${post.featuredImage || 'https://via.placeholder.com/300x200'}" alt="${post.title}">
            <div class="blog-card-content">
                <h2><a href="blog-post.html?id=${key}">${post.title}</a></h2>
                <div class="meta">
                    <span>By ${post.authorName || 'Admin'}</span> | <span>${new Date(post.lastSaved).toLocaleDateString()}</span>
                </div>
                <p class="description">${post.metaDescription || ''}</p>
                <a href="blog-post.html?id=${key}" class="btn btn-primary read-more">Read More</a>
            </div>
        </article>
    `;
    return postElement;
}

function fetchBlogs(searchQuery = '') {
    let query = firestoreDb.collection('blogs')
        .where('status', '==', 'published')
        .orderBy('lastSaved', 'desc');

    if (searchQuery) {
        query = query.where('title', '>=', searchQuery).where('title', '<=', searchQuery + '\uf8ff');
    }

    if (lastVisible) {
        query = query.startAfter(lastVisible);
    }

    query.limit(pageSize).get().then(snapshot => {
        if (snapshot.empty) {
            loadMoreBtn.style.display = 'none';
            return;
        }

        lastVisible = snapshot.docs[snapshot.docs.length - 1];

        snapshot.forEach(doc => {
            blogListing.appendChild(createBlogCard(doc.data(), doc.id));
        });

        if (snapshot.size < pageSize) {
            loadMoreBtn.style.display = 'none';
        }
    });
}

loadMoreBtn.addEventListener('click', () => fetchBlogs(searchInput.value));
searchInput.addEventListener('input', () => {
    blogListing.innerHTML = '';
    lastVisible = null;
    fetchBlogs(searchInput.value);
});

// Initial load
fetchBlogs();