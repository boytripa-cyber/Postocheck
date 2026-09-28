/* =====================================================
   POSTOCHECK
   TELA DE MANUTENÇÃO
===================================================== */

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import firebaseConfig from "./firebase-config.js";


/* =====================================================
   FIREBASE
===================================================== */

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const db =
    getFirestore(app);


/* =====================================================
   ELEMENTOS
===================================================== */

const maintenanceTitle =
    document.getElementById(
        "maintenanceTitle"
    );

const maintenanceMessage =
    document.getElementById(
        "maintenanceMessage"
    );

const maintenanceLoading =
    document.getElementById(
        "maintenanceLoading"
    );

const maintenanceError =
    document.getElementById(
        "maintenanceError"
    );

const maintenanceLogoutButton =
    document.getElementById(
        "maintenanceLogoutButton"
    );


/* =====================================================
   CARREGAR CONFIGURAÇÃO
===================================================== */

async function loadMaintenanceConfig() {

    try {

        /*
         * Estrutura:
         *
         * configuracoes/sistema
         */

        const configRef =
            doc(
                db,
                "configuracoes",
                "sistema"
            );


        const configSnapshot =
            await getDoc(
                configRef
            );


        if (
            !configSnapshot.exists()
        ) {

            console.warn(
                "Configuração de manutenção não encontrada."
            );


            /*
             * Se não existir configuração,
             * o sistema considera que não
             * está em manutenção.
             */

            window.location.replace(
                "index.html"
            );

            return;
        }


        const config =
            configSnapshot.data();


        /*
         * Verifica se a manutenção
         * realmente está ativa.
         */

        if (
            config.manutencaoAtiva !== true
        ) {

            window.location.replace(
                "index.html"
            );

            return;
        }


        /* =============================================
           TÍTULO
        ============================================= */

        if (
            maintenanceTitle
        ) {

            maintenanceTitle.textContent =
                config.titulo ||
                "Sistema em manutenção";
        }


        /* =============================================
           MENSAGEM
        ============================================= */

        if (
            maintenanceMessage
        ) {

            maintenanceMessage.textContent =
                config.mensagem ||
                "O PostoCheck está passando por uma manutenção. Tente novamente mais tarde.";
        }


        /* =============================================
           ESCONDER LOADING
        ============================================= */

        if (
            maintenanceLoading
        ) {

            maintenanceLoading.hidden =
                true;

            maintenanceLoading.style.display =
                "none";
        }

    }
    catch (error) {

        console.error(
            "Erro ao carregar manutenção:",
            error
        );


        if (
            maintenanceLoading
        ) {

            maintenanceLoading.hidden =
                true;

            maintenanceLoading.style.display =
                "none";
        }


        if (
            maintenanceError
        ) {

            maintenanceError.hidden =
                false;

            maintenanceError.style.display =
                "block";
        }
    }
}


/* =====================================================
   LOGOUT
===================================================== */

if (
    maintenanceLogoutButton
) {

    maintenanceLogoutButton.addEventListener(
        "click",
        async function () {

            maintenanceLogoutButton.disabled =
                true;

            maintenanceLogoutButton.textContent =
                "SAINDO...";


            try {

                await signOut(
                    auth
                );


                window.location.replace(
                    "login.html"
                );

            }
            catch (error) {

                console.error(
                    "Erro ao deslogar:",
                    error
                );


                maintenanceLogoutButton.disabled =
                    false;

                maintenanceLogoutButton.textContent =
                    "DESLOGAR";


                alert(
                    "Não foi possível deslogar."
                );
            }
        }
    );
}


/* =====================================================
   AUTENTICAÇÃO
===================================================== */

onAuthStateChanged(
    auth,
    function (user) {

        /*
         * A manutenção é uma tela para
         * usuários autenticados.
         */

        if (!user) {

            window.location.replace(
                "login.html"
            );

            return;
        }


        loadMaintenanceConfig();
    }
);