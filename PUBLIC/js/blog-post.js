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
const firestoreDb = firebase.firestore(); // Changed to firestore

const blogPostHeader = document.getElementById('blog-post-header');
const blogPostContent = document.getElementById('blog-post-content');
const commentsContainer = document.getElementById('comments-container');
const commentForm = document.getElementById('comment-form');
const categoryList = document.getElementById('category-list');
const latestPostsList = document.getElementById('latest-posts-list');

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

function renderPost(post) {
    document.title = post.title;
    blogPostHeader.innerHTML = `
        <h1>${post.title}</h1>
        <div class="meta">
            <span>By ${post.authorName || 'Admin'}</span> | <span>${new Date(post.lastSaved).toLocaleDateString()}</span>
        </div>
        <img src="${post.featuredImage || 'https://via.placeholder.com/800x400'}" alt="${post.title}">
    `;
    blogPostContent.innerHTML = post.content;
}

// function renderComments(comments) { ... } // Commented out for now

function fetchPost() {
    if (postId) {
        firestoreDb.collection('blogs').doc(postId).get()
            .then(doc => {
                if (doc.exists) {
                    renderPost(doc.data());
                    // fetchComments(); // Commented out for now
                } else {
                    console.error("No such document!");
                    blogPostContent.innerHTML = '<p>Blog post not found.</p>';
                }
            })
            .catch(error => {
                console.error("Error getting document:", error);
                blogPostContent.innerHTML = '<p>Error loading blog post.</p>';
            });
    } else {
        console.error("No post ID found in URL.");
        blogPostContent.innerHTML = '<p>No blog post specified.</p>';
    }
}

// function fetchComments() { ... } // Commented out for now

// commentForm.addEventListener('submit', e => { ... }); // Commented out for now

// function fetchCategories() { ... } // Commented out for now

// function fetchLatestPosts() { ... } // Commented out for now

fetchPost();
// fetchCategories(); // Commented out for now
// fetchLatestPosts(); // Commented out for now