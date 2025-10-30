
// document.addEventListener('DOMContentLoaded', function () {
//     const navbarPlaceholder = document.getElementById('navbar-placeholder');
//     const footerPlaceholder = document.getElementById('footer-placeholder');

//     if (navbarPlaceholder) {
//         fetch('navbar.html')
//             .then(response => response.text())
//             .then(data => {
//                 navbarPlaceholder.innerHTML = data;
//             });
//     }

//     if (footerPlaceholder) {
//         fetch('footer.html')
//             .then(response => response.text())
//             .then(data => {
//                 footerPlaceholder.innerHTML = data;
//             });
//     }
// });


document.addEventListener("DOMContentLoaded", () => {
  const navbarPlaceholder = document.getElementById("navbar-placeholder");
  const footerPlaceholder = document.getElementById("footer-placeholder");

  if (navbarPlaceholder) {
    fetch("navbar.html")
      .then((res) => res.text())
      .then((data) => (navbarPlaceholder.innerHTML = data));
  }

  if (footerPlaceholder) {
    fetch("footer.html")
      .then((res) => res.text())
      .then((data) => (footerPlaceholder.innerHTML = data));
  }
});

