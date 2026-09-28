"use strict";

/* ==========================================================
   POSTOCHECK - APP.JS
   ========================================================== */

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import firebaseConfig from "./firebase-config.js";


/* ==========================================================
   FIREBASE
   ========================================================== */

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


/* ==========================================================
   PÁGINA ATUAL
   ========================================================== */

const currentPage =
    window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

const isLoginPage =
    currentPage === "login.html";

const isHomePage =
    currentPage === "" ||
    currentPage === "index.html";

const isMaintenancePage =
    currentPage === "manutencao.html";


/* ==========================================================
   ELEMENTOS DA INTERFACE
   ========================================================== */

const menuButton =
    document.getElementById("menuButton");

const closeMenuButton =
    document.getElementById("closeMenuButton");

const sideMenu =
    document.getElementById("sideMenu");

const menuOverlay =
    document.getElementById("menuOverlay");

const loginPageButton =
    document.getElementById("loginPageButton");

const logoutButton =
    document.getElementById("logoutButton");

const sideMenuUserEmail =
    document.getElementById("sideMenuUserEmail");

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginError =
    document.getElementById("loginError");

const loginButton =
    document.getElementById("loginButton");


/* ==========================================================
   VARIÁVEIS
   ========================================================== */

let currentUser = null;
let userIsLoggedIn = false;

let recurrenceChart = null;

let resizeTimeout = null;

let maintenanceCheckInProgress = false;


/* ==========================================================
   MENU
   ========================================================== */

function openMenu() {

    if (sideMenu) {
        sideMenu.classList.add("active");
    }

    if (menuOverlay) {
        menuOverlay.classList.add("active");
    }

    document.body.classList.add("menu-open");
}


function closeMenu() {

    if (sideMenu) {
        sideMenu.classList.remove("active");
    }

    if (menuOverlay) {
        menuOverlay.classList.remove("active");
    }

    document.body.classList.remove("menu-open");
}


if (menuButton) {

    menuButton.addEventListener(
        "click",
        openMenu
    );

}


if (closeMenuButton) {

    closeMenuButton.addEventListener(
        "click",
        closeMenu
    );

}


if (menuOverlay) {

    menuOverlay.addEventListener(
        "click",
        closeMenu
    );

}


/* ==========================================================
   BOTÃO LOGIN
   ========================================================== */

if (loginPageButton) {

    loginPageButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "login.html";

        }
    );

}


/* ==========================================================
   LOGIN
   ========================================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            if (!email || !password) {

                showLoginError(
                    "Informe seu e-mail e sua senha."
                );

                return;
            }


            hideLoginError();


            if (loginButton) {

                loginButton.disabled = true;

                loginButton.textContent =
                    "ENTRANDO...";
            }


            try {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                /*
                 * Não redirecionamos aqui.
                 *
                 * O onAuthStateChanged vai confirmar
                 * que o login realmente aconteceu.
                 *
                 * Depois disso o usuário será enviado
                 * para o index.html.
                 */

            }
            catch (error) {

                console.error(
                    "PostoCheck: erro ao fazer login:",
                    error
                );


                let message =
                    "Não foi possível fazer login.";


                switch (error.code) {

                    case "auth/invalid-credential":

                        message =
                            "E-mail ou senha incorretos.";

                        break;


                    case "auth/user-not-found":

                        message =
                            "Usuário não encontrado.";

                        break;


                    case "auth/wrong-password":

                        message =
                            "Senha incorreta.";

                        break;


                    case "auth/invalid-email":

                        message =
                            "Informe um e-mail válido.";

                        break;


                    case "auth/too-many-requests":

                        message =
                            "Muitas tentativas. Tente novamente mais tarde.";

                        break;


                    case "auth/network-request-failed":

                        message =
                            "Erro de conexão. Verifique sua internet.";

                        break;
                }


                showLoginError(
                    message
                );


                if (loginButton) {

                    loginButton.disabled = false;

                    loginButton.textContent =
                        "ENTRAR";
                }
            }
        }
    );

}


/* ==========================================================
   ERRO LOGIN
   ========================================================== */

function showLoginError(message) {

    if (!loginError) {

        alert(message);

        return;
    }


    loginError.textContent =
        message;

    loginError.hidden = false;

    loginError.style.display =
        "block";
}


function hideLoginError() {

    if (!loginError) {
        return;
    }


    loginError.textContent =
        "";

    loginError.hidden = true;

    loginError.style.display =
        "none";
}


/* ==========================================================
   LOGOUT
   ========================================================== */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            try {

                await signOut(auth);

                closeMenu();

                /*
                 * Depois do logout o usuário deve
                 * voltar para a página inicial pública.
                 */

                window.location.replace(
                    "index.html"
                );

            }
            catch (error) {

                console.error(
                    "PostoCheck: erro ao sair:",
                    error
                );

                alert(
                    "Não foi possível sair da conta."
                );
            }
        }
    );

}


/* ==========================================================
   VERIFICAR MANUTENÇÃO
   ========================================================== */

async function checkMaintenanceMode() {

    try {

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


        if (!configSnapshot.exists()) {

            console.warn(
                "PostoCheck: documento configuracoes/sistema não existe."
            );

            return false;
        }


        const config =
            configSnapshot.data();


        return (
            config.manutencaoAtiva === true
        );

    }
    catch (error) {

        console.error(
            "PostoCheck: erro ao verificar manutenção:",
            error
        );

        /*
         * Se houver erro na leitura da configuração,
         * não bloqueamos a página inicial.
         */

        return false;
    }
}


/* ==========================================================
   ATUALIZAR INTERFACE CONFORME LOGIN
   ========================================================== */

async function updateInterface(user) {

    /* ======================================================
       USUÁRIO NÃO LOGADO
       ====================================================== */

    if (!user) {

        currentUser = null;

        userIsLoggedIn = false;


        closeMenu();

        hideRecurrenceChart();


        /*
         * Na página inicial:
         *
         * NÃO manda para login.
         *
         * O index.html é público.
         */

        if (isHomePage) {

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


            return;
        }


        /*
         * Se estiver na página de login,
         * simplesmente permanece nela.
         */

        if (isLoginPage) {

            if (menuButton) {

                menuButton.style.display =
                    "none";
            }


            if (loginPageButton) {

                loginPageButton.style.display =
                    "none";
            }


            return;
        }


        /*
         * Se tentar acessar manutenção sem login,
         * vai para login.
         */

        if (isMaintenancePage) {

            window.location.replace(
                "login.html"
            );

            return;
        }


        /*
         * Qualquer outra página protegida
         * também manda para login.
         */

        window.location.replace(
            "login.html"
        );

        return;
    }


    /* ======================================================
       USUÁRIO LOGADO
       ====================================================== */

    currentUser = user;

    userIsLoggedIn = true;


    console.log(
        "PostoCheck: usuário autenticado:",
        user.email
    );


    /* ======================================================
       VERIFICAR MANUTENÇÃO
       ====================================================== */

    let maintenanceActive =
        false;


    if (!maintenanceCheckInProgress) {

        maintenanceCheckInProgress =
            true;


        try {

            maintenanceActive =
                await checkMaintenanceMode();

        }
        finally {

            maintenanceCheckInProgress =
                false;
        }
    }


    console.log(
        "PostoCheck: manutenção ativa:",
        maintenanceActive
    );


    /* ======================================================
       MANUTENÇÃO ATIVA
       ====================================================== */

    if (
        maintenanceActive === true
    ) {

        /*
         * Usuário logado tentando acessar
         * qualquer página normal:
         *
         * manda para manutenção.
         */

        if (!isMaintenancePage) {

            window.location.replace(
                "manutencao.html"
            );

            return;
        }


        /*
         * Já está na manutenção.
         * Permanece nela.
         */

        return;
    }


    /* ======================================================
       MANUTENÇÃO DESATIVADA
       ====================================================== */

    if (isMaintenancePage) {

        window.location.replace(
            "index.html"
        );

        return;
    }


    /* ======================================================
       USUÁRIO LOGOU
       ====================================================== */

    if (isLoginPage) {

        /*
         * Login confirmado pelo Firebase.
         *
         * Agora sim vai para a página inicial.
         */

        window.location.replace(
            "index.html"
        );

        return;
    }


    /* ======================================================
       INTERFACE DO USUÁRIO LOGADO
       ====================================================== */

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
            user.email ||
            "Usuário";
    }


    /* ======================================================
       GRÁFICO
       ====================================================== */

    if (isHomePage) {

        loadRecurrenceChart(
            user
        );
    }
}


/* ==========================================================
   FIREBASE AUTH
   ========================================================== */

onAuthStateChanged(
    auth,
    function (user) {

        console.log(
            user
                ? "PostoCheck: login confirmado."
                : "PostoCheck: usuário não autenticado."
        );


        updateInterface(
            user
        );
    }
);


/* ==========================================================
   NORMALIZAR TEXTO
   ========================================================== */

function normalizeText(value) {

    return String(value || "")
        .trim()
        .replace(/\s+/g, " ");
}


/* ==========================================================
   FORMATAR DATA
   ========================================================== */

function formatAuditDate(value) {

    if (!value) {
        return "";
    }


    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        const parts =
            value.split("-");


        return (
            `${parts[2]}/${parts[1]}/${parts[0]}`
        );
    }


    if (
        value &&
        typeof value.toDate === "function"
    ) {

        return value
            .toDate()
            .toLocaleDateString(
                "pt-BR"
            );
    }


    if (
        value instanceof Date
    ) {

        return value
            .toLocaleDateString(
                "pt-BR"
            );
    }


    const date =
        new Date(value);


    if (
        !Number.isNaN(
            date.getTime()
        )
    ) {

        return date
            .toLocaleDateString(
                "pt-BR"
            );
    }


    return normalizeText(
        value
    );
}


/* ==========================================================
   BUSCAR AUDITORIAS
   ========================================================== */

async function getAuditsForUser(user) {

    if (!user) {
        return [];
    }


    const auditsRef =
        collection(
            db,
            "usuarios",
            user.uid,
            "auditorias"
        );


    const snapshot =
        await getDocs(
            auditsRef
        );


    const audits = [];


    snapshot.forEach(
        function (auditDoc) {

            audits.push({
                id: auditDoc.id,
                ...auditDoc.data()
            });

        }
    );


    return audits;
}


/* ==========================================================
   BUSCAR PERGUNTAS
   ========================================================== */

async function getAuditQuestions(user) {

    if (!user) {
        return [];
    }


    const questionsRef =
        collection(
            db,
            "usuarios",
            user.uid,
            "perguntasAuditoria"
        );


    const snapshot =
        await getDocs(
            questionsRef
        );


    const questions = [];


    snapshot.forEach(
        function (questionDoc) {

            const data =
                questionDoc.data();


            if (
                data.ativo === false
            ) {

                return;
            }


            questions.push({

                id:
                    questionDoc.id,

                pergunta:
                    data.pergunta ||
                    "",

                ordem:
                    Number(
                        data.ordem || 0
                    ),

                categoria:
                    data.categoria ||
                    "",

                tipoResposta:
                    data.tipoResposta ||
                    "sim_nao"
            });

        }
    );


    questions.sort(
        function (a, b) {

            return (
                a.ordem -
                b.ordem
            );
        }
    );


    return questions;
}


/* ==========================================================
   PEGAR RESPOSTA
   ========================================================== */

function getAuditAnswer(
    audit,
    questionId
) {

    if (
        !audit ||
        !audit.respostas
    ) {

        return null;
    }


    return (
        audit.respostas[
            questionId
        ] || null
    );
}


/* ==========================================================
   VERIFICAR NÃO CONFORMIDADE
   ========================================================== */

function isNonConformingAnswer(
    answer
) {

    if (!answer) {
        return false;
    }


    if (
        answer.tipoResposta &&
        answer.tipoResposta !== "sim_nao"
    ) {

        return false;
    }


    const response =
        String(
            answer.resposta ||
            ""
        )
            .trim()
            .toUpperCase();


    return (
        response === "NAO"
    );
}


/* ==========================================================
   CALCULAR REINCIDÊNCIAS
   ========================================================== */

function calculateRecurrence(
    audits,
    questions
) {

    const recurrenceMap =
        new Map();


    audits.forEach(
        function (audit) {

            const auditDate =
                formatAuditDate(
                    audit.data ||
                    audit.createdAt
                );


            questions.forEach(
                function (question) {

                    if (
                        question.tipoResposta &&
                        question.tipoResposta !== "sim_nao"
                    ) {

                        return;
                    }


                    const answer =
                        getAuditAnswer(
                            audit,
                            question.id
                        );


                    if (
                        !isNonConformingAnswer(
                            answer
                        )
                    ) {

                        return;
                    }


                    let item =
                        recurrenceMap.get(
                            question.id
                        );


                    if (!item) {

                        item = {

                            id:
                                question.id,

                            question:
                                question.pergunta ||
                                "Item sem descrição",

                            category:
                                question.categoria ||
                                "",

                            count:
                                0,

                            dates:
                                []
                        };


                        recurrenceMap.set(
                            question.id,
                            item
                        );
                    }


                    item.count += 1;


                    if (
                        auditDate &&
                        !item.dates.includes(
                            auditDate
                        )
                    ) {

                        item.dates.push(
                            auditDate
                        );
                    }

                }
            );

        }
    );


    recurrenceMap.forEach(
        function (item) {

            item.dates.sort(
                function (a, b) {

                    const dateA =
                        a.split("/")
                            .reverse()
                            .join("-");


                    const dateB =
                        b.split("/")
                            .reverse()
                            .join("-");


                    return dateA.localeCompare(
                        dateB
                    );
                }
            );

        }
    );


    return Array.from(
        recurrenceMap.values()
    )
        .filter(
            function (item) {

                return (
                    item.count >= 2
                );
            }
        )
        .sort(
            function (a, b) {

                if (
                    b.count !==
                    a.count
                ) {

                    return (
                        b.count -
                        a.count
                    );
                }


                return a.question.localeCompare(
                    b.question,
                    "pt-BR"
                );
            }
        );
}


/* ==========================================================
   LOADING
   ========================================================== */

function showRecurrenceLoading() {

    const section =
        document.getElementById(
            "recurrenceSection"
        );

    const loading =
        document.getElementById(
            "recurrenceLoading"
        );

    const empty =
        document.getElementById(
            "recurrenceEmpty"
        );

    const wrapper =
        document.getElementById(
            "recurrenceChartWrapper"
        );

    const error =
        document.getElementById(
            "recurrenceError"
        );


    if (section) {

        section.hidden =
            false;
    }


    if (loading) {

        loading.hidden =
            false;

        loading.style.display =
            "flex";
    }


    if (empty) {

        empty.hidden =
            true;

        empty.style.display =
            "none";
    }


    if (wrapper) {

        wrapper.hidden =
            true;

        wrapper.style.display =
            "none";
    }


    if (error) {

        error.hidden =
            true;

        error.style.display =
            "none";
    }
}


/* ==========================================================
   EMPTY
   ========================================================== */

function showRecurrenceEmpty() {

    const section =
        document.getElementById(
            "recurrenceSection"
        );

    const loading =
        document.getElementById(
            "recurrenceLoading"
        );

    const empty =
        document.getElementById(
            "recurrenceEmpty"
        );

    const wrapper =
        document.getElementById(
            "recurrenceChartWrapper"
        );

    const error =
        document.getElementById(
            "recurrenceError"
        );


    if (section) {

        section.hidden =
            false;
    }


    if (loading) {

        loading.hidden =
            true;

        loading.style.display =
            "none";
    }


    if (empty) {

        empty.hidden =
            false;

        empty.style.display =
            "block";
    }


    if (wrapper) {

        wrapper.hidden =
            true;

        wrapper.style.display =
            "none";
    }


    if (error) {

        error.hidden =
            true;

        error.style.display =
            "none";
    }
}


/* ==========================================================
   ERRO
   ========================================================== */

function showRecurrenceError() {

    const section =
        document.getElementById(
            "recurrenceSection"
        );

    const loading =
        document.getElementById(
            "recurrenceLoading"
        );

    const empty =
        document.getElementById(
            "recurrenceEmpty"
        );

    const wrapper =
        document.getElementById(
            "recurrenceChartWrapper"
        );

    const error =
        document.getElementById(
            "recurrenceError"
        );


    if (section) {

        section.hidden =
            false;
    }


    if (loading) {

        loading.hidden =
            true;

        loading.style.display =
            "none";
    }


    if (empty) {

        empty.hidden =
            true;

        empty.style.display =
            "none";
    }


    if (wrapper) {

        wrapper.hidden =
            true;

        wrapper.style.display =
            "none";
    }


    if (error) {

        error.hidden =
            false;

        error.style.display =
            "block";
    }
}


/* ==========================================================
   ESCONDER GRÁFICO
   ========================================================== */

function hideRecurrenceChart() {

    const section =
        document.getElementById(
            "recurrenceSection"
        );


    if (section) {

        section.hidden =
            true;
    }


    if (recurrenceChart) {

        recurrenceChart.destroy();

        recurrenceChart =
            null;
    }
}


/* ==========================================================
   CONFIGURAÇÃO RESPONSIVA
   ========================================================== */

function getResponsiveChartSettings(
    recurrence
) {

    const width =
        window.innerWidth;


    let barHeight;
    let fontSize;
    let xFontSize;
    let labelMaxLength;
    let chartPadding;


    if (width <= 400) {

        barHeight = 58;
        fontSize = 9;
        xFontSize = 9;
        labelMaxLength = 22;
        chartPadding = 6;

    }
    else if (width <= 600) {

        barHeight = 54;
        fontSize = 10;
        xFontSize = 10;
        labelMaxLength = 28;
        chartPadding = 8;

    }
    else if (width <= 900) {

        barHeight = 48;
        fontSize = 11;
        xFontSize = 11;
        labelMaxLength = 36;
        chartPadding = 10;

    }
    else {

        barHeight = 44;
        fontSize = 12;
        xFontSize = 12;
        labelMaxLength = 48;
        chartPadding = 15;
    }


    const calculatedHeight =
        Math.max(
            280,
            recurrence.length *
                barHeight +
                90
        );


    const maxHeight =
        width <= 600
            ? 700
            : 900;


    const chartHeight =
        Math.min(
            calculatedHeight,
            maxHeight
        );


    return {

        width,

        barHeight,

        fontSize,

        xFontSize,

        labelMaxLength,

        chartPadding,

        chartHeight
    };
}


/* ==========================================================
   QUEBRAR TEXTO DO GRÁFICO
   ========================================================== */

function breakChartLabel(
    label,
    maxCharacters
) {

    const text =
        normalizeText(label);


    if (
        !text ||
        text.length <= maxCharacters
    ) {

        return text;
    }


    const words =
        text.split(" ");


    const lines = [];

    let currentLine =
        "";


    words.forEach(
        function (word) {

            const testLine =
                currentLine
                    ? `${currentLine} ${word}`
                    : word;


            if (
                testLine.length >
                maxCharacters
            ) {

                if (currentLine) {

                    lines.push(
                        currentLine
                    );
                }


                currentLine =
                    word;

            }
            else {

                currentLine =
                    testLine;
            }

        }
    );


    if (currentLine) {

        lines.push(
            currentLine
        );
    }


    return lines;
}


/* ==========================================================
   RENDERIZAR GRÁFICO
   ========================================================== */

function renderRecurrenceChart(
    recurrence,
    auditCount
) {

    const section =
        document.getElementById(
            "recurrenceSection"
        );

    const loading =
        document.getElementById(
            "recurrenceLoading"
        );

    const empty =
        document.getElementById(
            "recurrenceEmpty"
        );

    const wrapper =
        document.getElementById(
            "recurrenceChartWrapper"
        );

    const error =
        document.getElementById(
            "recurrenceError"
        );

    const auditCountElement =
        document.getElementById(
            "recurrenceAuditCount"
        );

    const canvas =
        document.getElementById(
            "recurrenceChart"
        );


    if (!canvas) {

        console.warn(
            "PostoCheck: recurrenceChart não encontrado."
        );

        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "PostoCheck: Chart.js não carregado."
        );

        showRecurrenceError();

        return;
    }


    if (section) {

        section.hidden =
            false;
    }


    if (loading) {

        loading.hidden =
            true;

        loading.style.display =
            "none";
    }


    if (error) {

        error.hidden =
            true;

        error.style.display =
            "none";
    }


    if (auditCountElement) {

        auditCountElement.textContent =
            `${auditCount} ${
                auditCount === 1
                    ? "auditoria"
                    : "auditorias"
            }`;
    }


    if (
        recurrence.length === 0
    ) {

        showRecurrenceEmpty();

        return;
    }


    if (wrapper) {

        wrapper.hidden =
            false;

        wrapper.style.display =
            "block";

        wrapper.style.width =
            "100%";

        wrapper.style.maxWidth =
            "100%";

        wrapper.style.overflow =
            "hidden";

        wrapper.style.position =
            "relative";
    }


    if (recurrenceChart) {

        recurrenceChart.destroy();

        recurrenceChart =
            null;
    }


    const settings =
        getResponsiveChartSettings(
            recurrence
        );


    if (wrapper) {

        wrapper.style.height =
            `${settings.chartHeight}px`;

        wrapper.style.minHeight =
            "280px";
    }


    canvas.style.width =
        "100%";

    canvas.style.height =
        "100%";

    canvas.style.maxWidth =
        "100%";

    canvas.style.display =
        "block";


    const labels =
        recurrence.map(
            function (item) {

                return item.question;
            }
        );


    const values =
        recurrence.map(
            function (item) {

                return item.count;
            }
        );


    recurrenceChart =
        new Chart(
            canvas,
            {

                type:
                    "bar",


                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Auditorias não conformes",

                            data:
                                values,

                            backgroundColor:
                                "#f5c400",

                            borderColor:
                                "#000000",

                            borderWidth:
                                1,

                            borderRadius:
                                4,

                            barPercentage:
                                settings.width <= 600
                                    ? 0.62
                                    : 0.70,

                            categoryPercentage:
                                0.80
                        }

                    ]
                },


                options: {

                    indexAxis:
                        "y",

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    animation: {

                        duration:
                            settings.width <= 600
                                ? 200
                                : 300
                    },


                    layout: {

                        padding: {

                            top:
                                10,

                            bottom:
                                10,

                            left:
                                settings.chartPadding,

                            right:
                                settings.chartPadding
                        }
                    },


                    interaction: {

                        mode:
                            "nearest",

                        intersect:
                            true
                    },


                    plugins: {

                        legend: {

                            display:
                                false
                        },


                        tooltip: {

                            titleFont: {

                                size:
                                    settings.width <= 600
                                        ? 11
                                        : 13
                            },


                            bodyFont: {

                                size:
                                    settings.width <= 600
                                        ? 10
                                        : 12
                            },


                            padding:
                                settings.width <= 600
                                    ? 8
                                    : 10,


                            callbacks: {

                                title:
                                    function (
                                        tooltipItems
                                    ) {

                                        if (
                                            !tooltipItems.length
                                        ) {

                                            return "";
                                        }


                                        const index =
                                            tooltipItems[0]
                                                .dataIndex;


                                        return (
                                            recurrence[
                                                index
                                            ].question
                                        );
                                    },


                                label:
                                    function (
                                        context
                                    ) {

                                        const index =
                                            context.dataIndex;


                                        const item =
                                            recurrence[
                                                index
                                            ];


                                        return (
                                            ` ${item.count} ${
                                                item.count === 1
                                                    ? "auditoria"
                                                    : "auditorias"
                                            }`
                                        );
                                    },


                                afterLabel:
                                    function (
                                        context
                                    ) {

                                        const index =
                                            context.dataIndex;


                                        const item =
                                            recurrence[
                                                index
                                            ];


                                        if (
                                            !item.dates ||
                                            item.dates.length === 0
                                        ) {

                                            return "";
                                        }


                                        return [

                                            "",

                                            "Datas das reincidências:",

                                            ...item.dates.map(
                                                function (
                                                    date
                                                ) {

                                                    return `• ${date}`;
                                                }
                                            )

                                        ];
                                    }
                            }
                        }
                    },


                    scales: {

                        x: {

                            beginAtZero:
                                true,


                            ticks: {

                                precision:
                                    0,

                                stepSize:
                                    1,


                                font: {

                                    size:
                                        settings.xFontSize
                                }
                            },


                            grid: {

                                color:
                                    "rgba(0, 0, 0, 0.08)"
                            }
                        },


                        y: {

                            grid: {

                                display:
                                    false
                            },


                            ticks: {

                                autoSkip:
                                    false,

                                padding:
                                    settings.width <= 600
                                        ? 5
                                        : 8,


                                font: {

                                    size:
                                        settings.fontSize
                                },


                                callback:
                                    function (
                                        value
                                    ) {

                                        const label =
                                            this.getLabelForValue(
                                                value
                                            );


                                        return breakChartLabel(
                                            label,
                                            settings.labelMaxLength
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/* ==========================================================
   CARREGAR GRÁFICO
   ========================================================== */

async function loadRecurrenceChart(
    user
) {

    if (
        !user ||
        !isHomePage
    ) {

        hideRecurrenceChart();

        return;
    }


    showRecurrenceLoading();


    try {

        const [
            audits,
            questions
        ] =
            await Promise.all([

                getAuditsForUser(
                    user
                ),

                getAuditQuestions(
                    user
                )

            ]);


        console.log(
            "PostoCheck: auditorias:",
            audits.length
        );


        console.log(
            "PostoCheck: perguntas:",
            questions.length
        );


        const auditCountElement =
            document.getElementById(
                "recurrenceAuditCount"
            );


        if (auditCountElement) {

            auditCountElement.textContent =
                `${audits.length} ${
                    audits.length === 1
                        ? "auditoria"
                        : "auditorias"
                }`;
        }


        if (
            audits.length === 0
        ) {

            showRecurrenceEmpty();

            return;
        }


        if (
            questions.length === 0
        ) {

            showRecurrenceEmpty();

            return;
        }


        const recurrence =
            calculateRecurrence(
                audits,
                questions
            );


        console.log(
            "PostoCheck: reincidências:",
            recurrence
        );


        renderRecurrenceChart(
            recurrence,
            audits.length
        );

    }
    catch (error) {

        console.error(
            "PostoCheck: erro ao carregar gráfico:",
            error
        );


        showRecurrenceError();
    }
}


/* ==========================================================
   REDIMENSIONAR GRÁFICO
   ========================================================== */

function resizeRecurrenceChart() {

    if (
        !recurrenceChart ||
        !currentUser ||
        !isHomePage
    ) {

        return;
    }


    recurrenceChart.resize();


    clearTimeout(
        resizeTimeout
    );


    resizeTimeout =
        setTimeout(
            async function () {

                if (
                    currentUser &&
                    isHomePage
                ) {

                    await loadRecurrenceChart(
                        currentUser
                    );
                }

            },
            300
        );
}


window.addEventListener(
    "resize",
    resizeRecurrenceChart
);


window.addEventListener(
    "orientationchange",
    function () {

        clearTimeout(
            resizeTimeout
        );


        resizeTimeout =
            setTimeout(
                function () {

                    if (
                        recurrenceChart &&
                        currentUser &&
                        isHomePage
                    ) {

                        loadRecurrenceChart(
                            currentUser
                        );
                    }

                },
                350
            );
    }
);


/* ==========================================================
   FECHAR MENU NO DESKTOP
   ========================================================== */

window.addEventListener(
    "resize",
    function () {

        if (
            window.innerWidth > 900
        ) {

            closeMenu();
        }
    }
);


/* ==========================================================
   LIMPEZA
   ========================================================== */

window.addEventListener(
    "beforeunload",
    function () {

        if (recurrenceChart) {

            recurrenceChart.destroy();

            recurrenceChart =
                null;
        }
    }
);


/* ==========================================================
   DEBUG
   ========================================================== */

console.log(
    "PostoCheck: app.js carregado."
);


console.log(
    "PostoCheck: página:",
    currentPage
);