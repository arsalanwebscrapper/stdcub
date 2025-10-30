import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const urlParams = new URLSearchParams(window.location.search);
const courseName = urlParams.get('course');
console.log("Course Name:", courseName);

if (courseName) {
    const courseRef = ref(database, 'courses/' + courseName);
    get(courseRef).then((snapshot) => {
        console.log("Snapshot exists:", snapshot.exists());
        if (snapshot.exists()) {
            const courseData = snapshot.val();
            console.log("Course Data:", courseData);

            // Hero Section
            const heroSection = document.querySelector('.hero');
            if (heroSection) {
                heroSection.classList.add(courseData.heroBgColor);
            }
            const courseTitle = document.getElementById('course-title');
            if (courseTitle) {
                courseTitle.textContent = courseData.title;
            }
            const courseTagline = document.getElementById('course-tagline');
            if (courseTagline) {
                courseTagline.textContent = courseData.tagline;
            }
            const courseImage = document.getElementById('course-image');
            if (courseImage) {
                courseImage.src = courseData.image;
            }

            // What Your Child Will Learn Section
            const learningPoints = document.getElementById('learning-points');
            if (learningPoints && courseData.learningOutcomes) {
                const colors = ['pink-bg', 'baby-pink-bg', 'soft-blue-bg'];
                let colorIndex = 0;
                courseData.learningOutcomes.forEach(point => {
                    const div = document.createElement('div');
                    div.classList.add(colors[colorIndex]);
                    div.innerHTML = `<img src="${point.icon}" alt=""><span>${point.text}</span>`;
                    learningPoints.appendChild(div);
                    colorIndex = (colorIndex + 1) % colors.length;
                });
            }

            // Stats Section
            const statsSection = document.getElementById('stats-section');
            if (statsSection && courseData.stats) {
                courseData.stats.forEach(stat => {
                    const div = document.createElement('div');
                    div.classList.add('stat-item');
                    div.innerHTML = `<h3>${stat.value}</h3><p>${stat.label}</p>`;
                    statsSection.appendChild(div);
                });
            }

            // Start Your Confidence Journey Section
            const confidenceJourneySection = document.getElementById('confidence-journey-section');
            if (confidenceJourneySection && courseData.confidenceJourney) {
                courseData.confidenceJourney.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('box', item.color + '-bg');
                    div.innerHTML = `<h4>${item.title}</h4><p>${item.text}</p>`;
                    confidenceJourneySection.appendChild(div);
                });
            }

            // Checkout Education Features Section
            const educationFeaturesSection = document.getElementById('education-features-section');
            if (educationFeaturesSection && courseData.educationFeatures) {
                courseData.educationFeatures.forEach(feature => {
                    const div = document.createElement('div');
                    div.classList.add('card');
                    let skillsHtml = '';
                    if (feature.skills) {
                        feature.skills.forEach(skill => {
                            skillsHtml += `<li>${skill}</li>`;
                        });
                    }
                    div.innerHTML = `
                        <div class="card-body">
                            <h5 class="card-title"><img src="${feature.icon}" alt=""> ${feature.title}</h5>
                            <ul>${skillsHtml}</ul>
                            <a href="#" class="btn btn-primary">Download</a>
                        </div>
                    `;
                    educationFeaturesSection.appendChild(div);
                });
            }

            // Left/Right Section
            if (courseData.leftRight) {
                const leftRightImage = document.getElementById('left-right-image');
                if(leftRightImage) {
                    leftRightImage.src = courseData.leftRight.image;
                }
                const leftRightHeading = document.getElementById('left-right-heading');
                if(leftRightHeading) {
                    leftRightHeading.textContent = courseData.leftRight.heading;
                }
                const leftRightParagraph = document.getElementById('left-right-paragraph');
                if(leftRightParagraph) {
                    leftRightParagraph.textContent = courseData.leftRight.paragraph;
                }
            }

            // Parents Review Section
            const parentsReviewSection = document.getElementById('parents-review-section');
            if (parentsReviewSection && courseData.parentReviews) {
                courseData.parentReviews.forEach(review => {
                    const div = document.createElement('div');
                    div.classList.add('card');
                    div.innerHTML = `
                        <div class="card-body">
                            <p class="card-text">"${review.review}"</p>
                            <div class="d-flex align-items-center">
                                <img src="${review.image}" class="rounded-circle" width="50" alt="Parent">
                                <div class="ms-3">
                                    <h6 class="fw-bold mb-0">${review.name}</h6>
                                </div>
                            </div>
                        </div>
                    `;
                    parentsReviewSection.appendChild(div);
                });
            }

        } else {
            console.log("No data available");
        }
    }).catch((error) => {
        console.error(error);
    });
}