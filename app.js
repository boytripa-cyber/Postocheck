/* =====================================================
   POSTOCHECK
   APP.JS
   LOGIN + HOMEPAGE + FIREBASE
===================================================== */


/* =====================================================
   FIREBASE
===================================================== */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";


import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


import firebaseConfig from "./firebase-config.js";


const app =
    initializeApp(firebaseConfig);


const auth =
    getAuth(app);


/* =====================================================
   IDENTIFICAÇÃO DA PÁGINA
===================================================== */

const currentPage =
    window.location.pathname
        .split("/")
        .pop() || "index.html";


const isLoginPage =
    currentPage === "login.html";


const isHomePage =
    currentPage === "index.html" ||
    currentPage === "";


/* =====================================================
   ELEMENTOS DO LOGIN
===================================================== */

const loginForm =
    document.getElementById("loginForm");


const emailInput =
    document.getElementById("email");


const passwordInput =
    document.getElementById("password");


const loginButton =
    document.getElementById("loginButton");


const message =
    document.getElementById("message");


/* =====================================================
   ELEMENTOS DA HOMEPAGE
===================================================== */

const menuButton =
    document.getElementById("menuButton");


const closeMenuButton =
    document.getElementById("closeMenuButton");


const sideMenu =
    document.getElementById("sideMenu");


const menuOverlay =
    document.getElementById("menuOverlay");


const sideMenuUserEmail =
    document.getElementById("sideMenuUserEmail");


const logoutButton =
    document.getElementById("logoutButton");


const loginPageButton =
    document.getElementById("loginPageButton");


const menuItems =
    document.querySelectorAll(
        ".side-menu-item"
    );


/* =====================================================
   ESTADO
===================================================== */

let userIsLoggedIn = false;


/* =====================================================
   ABRIR MENU
===================================================== */

function openMenu() {

    if (!userIsLoggedIn) {
        return;
    }


    if (!sideMenu) {
        return;
    }


    sideMenu.classList.add(
        "active"
    );


    if (menuOverlay) {

        menuOverlay.classList.add(
            "active"
        );

    }


    sideMenu.setAttribute(
        "aria-hidden",
        "false"
    );


    if (menuButton) {

        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );

    }


    document.body.classList.add(
        "menu-open"
    );

}


/* =====================================================
   FECHAR MENU
===================================================== */

function closeMenu() {

    if (sideMenu) {

        sideMenu.classList.remove(
            "active"
        );


        sideMenu.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    if (menuOverlay) {

        menuOverlay.classList.remove(
            "active"
        );

    }


    if (menuButton) {

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    document.body.classList.remove(
        "menu-open"
    );

}


/* =====================================================
   ATUALIZAR INTERFACE
===================================================== */

function updateInterface(user) {

    /* ================================================
       USUÁRIO LOGADO
    ================================================ */

    if (user) {

        userIsLoggedIn = true;


        if (menuButton) {

            menuButton.style.display =
                "flex";

        }


        if (loginPageButton) {

            loginPageButton.style.display =
                "none";

        }


        if (sideMenuUserEmail) {

            sideMenuUserEmail.textContent =
                user.email || "Usuário";

        }


        return;
    }


    /* ================================================
       USUÁRIO DESLOGADO
    ================================================ */

    userIsLoggedIn = false;


    closeMenu();


    if (menuButton) {

        menuButton.style.display =
            "none";

    }


    if (loginPageButton) {

        loginPageButton.style.display =
            "flex";

    }


    if (sideMenuUserEmail) {

        sideMenuUserEmail.textContent =
            "";

    }

}


/* =====================================================
   BOTÃO DO MENU
===================================================== */

if (menuButton) {

    menuButton.addEventListener(
        "click",
        openMenu
    );

}


/* =====================================================
   FECHAR MENU
===================================================== */

if (closeMenuButton) {

    closeMenuButton.addEventListener(
        "click",
        closeMenu
    );

}


/* =====================================================
   OVERLAY
===================================================== */

if (menuOverlay) {

    menuOverlay.addEventListener(
        "click",
        closeMenu
    );

}


/* =====================================================
   ESC
===================================================== */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" ||
            event.key === "Esc"
        ) {

            closeMenu();

        }

    }
);


/* =====================================================
   ITENS DO MENU
===================================================== */

menuItems.forEach(
    (item) => {

        item.addEventListener(
            "click",
            (event) => {

                if (!userIsLoggedIn) {

                    event.preventDefault();

                    closeMenu();

                    return;

                }


                closeMenu();

            }
        );

    }
);


/* =====================================================
   FIREBASE — ESTADO DE AUTENTICAÇÃO
===================================================== */

onAuthStateChanged(
    auth,
    (user) => {

        console.log(
            user
                ? "PostoCheck: usuário logado."
                : "PostoCheck: usuário deslogado."
        );


        updateInterface(user);


        /* ============================================
           SE ESTIVER LOGADO E TENTAR ABRIR LOGIN
        ============================================ */

        if (
            user &&
            isLoginPage
        ) {

            window.location.replace(
                "index.html"
            );

        }

    }
);


/* =====================================================
   FORMULÁRIO DE LOGIN
===================================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (
                !emailInput ||
                !passwordInput ||
                !loginButton
            ) {

                return;

            }


            const email =
                emailInput.value.trim();


            const password =
                passwordInput.value;


            /* ========================================
               VALIDAÇÃO
            ======================================== */

            if (!email) {

                showMessage(
                    "Digite seu e-mail.",
                    true
                );


                emailInput.focus();

                return;

            }


            if (!password) {

                showMessage(
                    "Digite sua senha.",
                    true
                );


                passwordInput.focus();

                return;

            }


            /* ========================================
               BOTÃO
            ======================================== */

            loginButton.disabled =
                true;


            loginButton.textContent =
                "ENTRANDO...";


            showMessage("");


            /* ========================================
               LOGIN
            ======================================== */

            try {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


                showMessage(
                    "Login realizado com sucesso.",
                    false
                );


                window.location.replace(
                    "index.html"
                );

            }


            /* ========================================
               ERROS
            ======================================== */

            catch (error) {

                console.error(
                    "Erro no login:",
                    error
                );


                let errorMessage =
                    "Não foi possível realizar o login.";


                switch (error.code) {

                    case "auth/invalid-email":

                        errorMessage =
                            "Digite um e-mail válido.";

                        break;


                    case "auth/invalid-credential":

                    case "auth/user-not-found":

                    case "auth/wrong-password":

                        errorMessage =
                            "E-mail ou senha incorretos.";

                        break;


                    case "auth/user-disabled":

                        errorMessage =
                            "Esta conta foi desativada.";

                        break;


                    case "auth/too-many-requests":

                        errorMessage =
                            "Muitas tentativas. Tente novamente mais tarde.";

                        break;


                    case "auth/network-request-failed":

                        errorMessage =
                            "Erro de conexão com o Firebase.";

                        break;


                    case "auth/operation-not-allowed":

                        errorMessage =
                            "O login por e-mail e senha não está habilitado no Firebase.";

                        break;


                    case "auth/internal-error":

                        errorMessage =
                            "Ocorreu um erro interno. Tente novamente.";

                        break;


                    default:

                        errorMessage =
                            "Erro ao realizar login.";

                        break;

                }


                showMessage(
                    errorMessage,
                    true
                );


                passwordInput.value =
                    "";


                passwordInput.focus();

            }


            /* ========================================
               RESTAURAR BOTÃO
            ======================================== */

            finally {

                loginButton.disabled =
                    false;


                loginButton.textContent =
                    "ENTRAR";

            }

        }
    );

}


/* =====================================================
   MENSAGEM
===================================================== */

function showMessage(
    text,
    error = false
) {

    if (!message) {
        return;
    }


    message.textContent =
        text;


    message.style.color =
        error
            ? "#d00000"
            : "#008000";

}


/* =====================================================
   DESLOGAR
===================================================== */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            logoutButton.disabled =
                true;


            logoutButton.textContent =
                "SAINDO...";


            try {

                await signOut(auth);


                closeMenu();


                window.location.replace(
                    "index.html"
                );

            }


            catch (error) {

                console.error(
                    "Erro ao deslogar:",
                    error
                );


                logoutButton.disabled =
                    false;


                logoutButton.textContent =
                    "DESLOGAR";


                alert(
                    "Erro ao deslogar: " +
                    error.message
                );

            }

        }
    );

}

