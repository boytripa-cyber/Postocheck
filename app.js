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


/* ==========================================================
   LOGIN
   ========================================================== */

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
   ESTADO DA APLICAÇÃO
   ========================================================== */

let currentUser = null;

let userIsLoggedIn = false;

let maintenanceCheckInProgress = false;

let recurrenceChart = null;


/* ==========================================================
   IDENTIFICAR PÁGINA ATUAL
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
   MENU LATERAL
   ========================================================== */

function openMenu() {

    if (sideMenu) {

        sideMenu.classList.add("active");
    }

    if (menuOverlay) {

        menuOverlay.classList.add("active");
    }

    document.body.classList.add(
        "menu-open"
    );
}


function closeMenu() {

    if (sideMenu) {

        sideMenu.classList.remove("active");
    }

    if (menuOverlay) {

        menuOverlay.classList.remove("active");
    }

    document.body.classList.remove(
        "menu-open"
    );
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


            if (loginButton) {

                loginButton.disabled =
                    true;

                loginButton.textContent =
                    "ENTRANDO...";
            }


            hideLoginError();


            try {

                /*
                 * O redirecionamento NÃO acontece aqui.
                 *
                 * Primeiro o Firebase confirma o login.
                 * Depois onAuthStateChanged() verifica
                 * se existe manutenção.
                 */

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            }
            catch (error) {

                console.error(
                    "Erro ao fazer login:",
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

                    loginButton.disabled =
                        false;

                    loginButton.textContent =
                        "ENTRAR";
                }
            }
        }
    );
}


/* ==========================================================
   ERROS DE LOGIN
   ========================================================== */

function showLoginError(message) {

    if (!loginError) {

        alert(message);

        return;
    }


    loginError.textContent =
        message;

    loginError.style.display =
        "block";

    loginError.hidden =
        false;
}


function hideLoginError() {

    if (!loginError) {

        return;
    }


    loginError.textContent =
        "";

    loginError.style.display =
        "none";

    loginError.hidden =
        true;
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

                window.location.replace(
                    "login.html"
                );

            }
            catch (error) {

                console.error(
                    "Erro ao deslogar:",
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
   VERIFICAR MODO DE MANUTENÇÃO
   ========================================================== */

/*
 * IMPORTANTE:
 *
 * Esta função NÃO é chamada para usuários deslogados.
 *
 * Ela só é executada depois que o Firebase confirma
 * que existe um usuário autenticado.
 */

async function checkMaintenanceMode() {

    console.log(
        "PostoCheck: verificando manutenção..."
    );


    try {

        const configRef =
            doc(
                db,
                "configuracoes",
                "sistema"
            );


        console.log(
            "PostoCheck: lendo configuracoes/sistema..."
        );


        const configSnapshot =
            await getDoc(
                configRef
            );


        if (
            !configSnapshot.exists()
        ) {

            console.warn(
                "PostoCheck: configuracoes/sistema não existe."
            );


            /*
             * Se não existe configuração,
             * considera manutenção desligada.
             */

            return false;
        }


        const config =
            configSnapshot.data();


        console.log(
            "PostoCheck: configuração:",
            config
        );


        const maintenanceActive =
            config.manutencaoAtiva === true;


        console.log(
            "PostoCheck: manutenção ativa:",
            maintenanceActive
        );


        return maintenanceActive;

    }
    catch (error) {

        console.error(
            "PostoCheck: erro ao verificar manutenção:",
            error
        );


        /*
         * Em caso de erro de leitura, não redirecionamos
         * automaticamente para manutenção.
         */

        return false;
    }
}


/* ==========================================================
   ATUALIZAR INTERFACE
   ========================================================== */

async function updateInterface(user) {

    /*
     * ======================================================
     * USUÁRIO NÃO AUTENTICADO
     * ======================================================
     */

    if (!user) {

        console.log(
            "PostoCheck: nenhum usuário autenticado."
        );


        currentUser =
            null;

        userIsLoggedIn =
            false;


        closeMenu();

        hideRecurrenceChart();


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


        /*
         * Se estiver na página de manutenção sem
         * estar logado, NÃO permanece nela.
         *
         * Vai para o login.
         */

        if (
            isMaintenancePage
        ) {

            window.location.replace(
                "login.html"
            );

            return;
        }


        /*
         * Se estiver em uma página protegida,
         * também vai para o login.
         */

        if (
            !isLoginPage &&
            !isHomePage
        ) {

            window.location.replace(
                "login.html"
            );

            return;
        }


        return;
    }


    /*
     * ======================================================
     * USUÁRIO AUTENTICADO
     * ======================================================
     */

    currentUser =
        user;

    userIsLoggedIn =
        true;


    console.log(
        "PostoCheck: usuário autenticado:",
        user.email
    );


    /*
     * ======================================================
     * AGORA SIM VERIFICAR MANUTENÇÃO
     * ======================================================
     */

    let maintenanceActive =
        false;


    /*
     * Evita duas verificações simultâneas.
     */

    if (
        !maintenanceCheckInProgress
    ) {

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
        "PostoCheck: resultado manutenção:",
        maintenanceActive
    );


    /*
     * ======================================================
     * MANUTENÇÃO ATIVA
     * ======================================================
     */

    if (
        maintenanceActive === true
    ) {

        console.log(
            "PostoCheck: MANUTENÇÃO ATIVA."
        );


        /*
         * O usuário já está autenticado.
         *
         * Agora pode ser enviado para a página
         * de manutenção.
         */

        if (
            !isMaintenancePage
        ) {

            console.log(
                "PostoCheck: redirecionando para manutencao.html..."
            );


            window.location.replace(
                "manutencao.html"
            );


            return;
        }


        /*
         * Se já estiver na manutenção,
         * não faz nada.
         */

        return;
    }


    /*
     * ======================================================
     * MANUTENÇÃO DESATIVADA
     * ======================================================
     */

    console.log(
        "PostoCheck: manutenção desativada."
    );


    /*
     * Se estiver na manutenção e a manutenção
     * foi desligada, volta para a Home.
     */

    if (
        isMaintenancePage
    ) {

        window.location.replace(
            "index.html"
        );

        return;
    }


    /*
     * ======================================================
     * LOGIN REALIZADO COM SUCESSO
     * ======================================================
     *
     * Se a manutenção estiver desligada e o usuário
     * ainda estiver na tela de login, vai para Home.
     */

    if (
        isLoginPage
    ) {

        console.log(
            "PostoCheck: login concluído. Indo para index.html..."
        );


        window.location.replace(
            "index.html"
        );


        return;
    }


    /*
     * ======================================================
     * INTERFACE NORMAL
     * ======================================================
     */

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


    /*
     * ======================================================
     * GRÁFICO DE REINCIDÊNCIA
     * ======================================================
     */

    if (isHomePage) {

        loadRecurrenceChart(
            user
        );
    }
}


/* ==========================================================
   AUTH STATE
   ========================================================== */

onAuthStateChanged(
    auth,
    function (user) {

        console.log(
            "PostoCheck: alteração no estado de autenticação:",
            user
                ? user.email
                : "deslogado"
        );


        /*
         * A partir daqui o Firebase já confirmou
         * se existe ou não um usuário.
         */

        updateInterface(
            user
        );
    }
);


/* ==========================================================
   FUNÇÃO PARA NORMALIZAR TEXTO
   ========================================================== */

function normalizeText(value) {

    return String(
        value || ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        );
}


/* ==========================================================
   FORMATAR DATA DA AUDITORIA
   ========================================================== */

function formatAuditDate(value) {

    if (!value) {

        return "";
    }


    /*
     * Caso seja uma string YYYY-MM-DD,
     * tratamos manualmente para evitar
     * alteração de dia por timezone.
     */

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        const [
            year,
            month,
            day
        ] =
            value.split("-");


        return (
            `${day}/${month}/${year}`
        );
    }


    /*
     * Timestamp do Firestore.
     */

    if (
        value &&
        typeof value.toDate === "function"
    ) {

        const date =
            value.toDate();


        return date.toLocaleDateString(
            "pt-BR"
        );
    }


    /*
     * Date normal.
     */

    if (
        value instanceof Date
    ) {

        return value.toLocaleDateString(
            "pt-BR"
        );
    }


    /*
     * ISO ou outro formato.
     */

    const date =
        new Date(value);


    if (
        !Number.isNaN(
            date.getTime()
        )
    ) {

        return date.toLocaleDateString(
            "pt-BR"
        );
    }


    return normalizeText(
        value
    );
}


/* ==========================================================
   BUSCAR AUDITORIAS DO USUÁRIO
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

            const data =
                auditDoc.data();


            audits.push({

                id:
                    auditDoc.id,

                ...data

            });
        }
    );


    return audits;
}


/* ==========================================================
   BUSCAR PERGUNTAS DO CHECKLIST
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


            /*
             * Perguntas desativadas não participam.
             */

            if (
                data.ativo === false
            ) {

                return;
            }


            questions.push({

                id:
                    questionDoc.id,

                pergunta:
                    data.pergunta || "",

                ordem:
                    Number(
                        data.ordem || 0
                    ),

                categoria:
                    data.categoria || "",

                tipoResposta:
                    data.tipoResposta ||
                    "sim_nao"

            });
        }
    );


    questions.sort(
        function (a, b) {

            return a.ordem - b.ordem;
        }
    );


    return questions;
}


/* ==========================================================
   PEGAR RESPOSTA DA AUDITORIA
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
        audit.respostas[questionId] ||
        null
    );
}


/* ==========================================================
   VERIFICAR SE RESPOSTA É NÃO CONFORME
   ========================================================== */

function isNonConformingAnswer(
    answer
) {

    if (!answer) {

        return false;
    }


    /*
     * Só consideramos reincidência para
     * perguntas do tipo SIM / NÃO.
     */

    if (
        answer.tipoResposta &&
        answer.tipoResposta !== "sim_nao"
    ) {

        return false;
    }


    const response =
        String(
            answer.resposta || ""
        )
            .trim()
            .toUpperCase();


    return response === "NAO";
}


/* ==========================================================
   CALCULAR REINCIDÊNCIAS
   ========================================================== */

function calculateRecurrence(
    audits,
    questions
) {

    /*
     * Estrutura:
     *
     * questionId -> {
     *     question,
     *     category,
     *     count,
     *     dates
     * }
     */

    const recurrenceMap =
        new Map();


    /*
     * Cada auditoria conta no máximo uma vez
     * para cada pergunta.
     */

    audits.forEach(
        function (audit) {

            const auditDate =
                formatAuditDate(
                    audit.data ||
                    audit.createdAt
                );


            questions.forEach(
                function (question) {

                    /*
                     * Só perguntas SIM/NÃO.
                     */

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


                    /*
                     * Uma auditoria = uma ocorrência.
                     */

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


    /*
     * Só aparecem itens com pelo menos
     * 2 auditorias não conformes.
     */

    const recurrence =
        Array.from(
            recurrenceMap.values()
        )
            .filter(
                function (item) {

                    return item.count >= 2;
                }
            )
            .sort(
                function (a, b) {

                    if (
                        b.count !== a.count
                    ) {

                        return b.count - a.count;
                    }


                    return a.question.localeCompare(
                        b.question,
                        "pt-BR"
                    );
                }
            );


    return recurrence;
}


/* ==========================================================
   MOSTRAR ESTADO DE CARREGAMENTO
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

        section.hidden = false;
    }


    if (loading) {

        loading.hidden = false;

        loading.style.display =
            "flex";
    }


    if (empty) {

        empty.hidden = true;

        empty.style.display =
            "none";
    }


    if (wrapper) {

        wrapper.hidden = true;

        wrapper.style.display =
            "none";
    }


    if (error) {

        error.hidden = true;

        error.style.display =
            "none";
    }
}


/* ==========================================================
   MOSTRAR ESTADO VAZIO
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

        section.hidden = false;
    }


    if (loading) {

        loading.hidden = true;

        loading.style.display =
            "none";
    }


    if (empty) {

        empty.hidden = false;

        empty.style.display =
            "block";
    }


    if (wrapper) {

        wrapper.hidden = true;

        wrapper.style.display =
            "none";
    }


    if (error) {

        error.hidden = true;

        error.style.display =
            "none";
    }
}


/* ==========================================================
   MOSTRAR ERRO DO GRÁFICO
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

        section.hidden = false;
    }


    if (loading) {

        loading.hidden = true;

        loading.style.display =
            "none";
    }


    if (empty) {

        empty.hidden = true;

        empty.style.display =
            "none";
    }


    if (wrapper) {

        wrapper.hidden = true;

        wrapper.style.display =
            "none";
    }


    if (error) {

        error.hidden = false;

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

        section.hidden = true;
    }
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
            "Canvas recurrenceChart não encontrado."
        );

        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        console.error(
            "Chart.js não foi carregado."
        );

        showRecurrenceError();

        return;
    }


    if (section) {

        section.hidden = false;
    }


    if (loading) {

        loading.hidden = true;

        loading.style.display =
            "none";
    }


    if (empty) {

        empty.hidden = true;

        empty.style.display =
            "none";
    }


    if (error) {

        error.hidden = true;

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

        wrapper.hidden = false;

        wrapper.style.display =
            "block";
    }


    /*
     * Destruir gráfico anterior.
     */

    if (recurrenceChart) {

        recurrenceChart.destroy();

        recurrenceChart =
            null;
    }


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

                    labels:
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
                                0.7,

                            categoryPercentage:
                                0.8

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

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },

                    plugins: {

                        legend: {

                            display:
                                false

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function (
                                        context
                                    ) {

                                        const index =
                                            context.dataIndex;

                                        const item =
                                            recurrence[index];


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
                                            recurrence[index];


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
                                    1

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

                            }

                        }

                    }

                }

            }
        );
}


/* ==========================================================
   CARREGAR GRÁFICO DE REINCIDÊNCIA
   ========================================================== */

async function loadRecurrenceChart(user) {

    if (
        !user ||
        !isHomePage
    ) {

        hideRecurrenceChart();

        return;
    }


    showRecurrenceLoading();


    try {

        /*
         * Buscar auditorias e perguntas.
         */

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
            "PostoCheck: auditorias encontradas:",
            audits.length
        );


        console.log(
            "PostoCheck: perguntas encontradas:",
            questions.length
        );


        /*
         * Atualizar contador de auditorias.
         */

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


        /*
         * Sem auditorias.
         */

        if (
            audits.length === 0
        ) {

            showRecurrenceEmpty();

            return;
        }


        /*
         * Sem perguntas.
         */

        if (
            questions.length === 0
        ) {

            showRecurrenceEmpty();

            return;
        }


        /*
         * Calcular reincidências.
         */

        const recurrence =
            calculateRecurrence(
                audits,
                questions
            );


        console.log(
            "PostoCheck: reincidências:",
            recurrence
        );


        /*
         * Renderizar.
         */

        renderRecurrenceChart(
            recurrence,
            audits.length
        );

    }
    catch (error) {

        console.error(
            "PostoCheck: erro ao carregar reincidências:",
            error
        );


        showRecurrenceError();
    }
}


/* ==========================================================
   PROTEÇÃO CONTRA SAÍDA DA PÁGINA COM MENU ABERTO
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
   INICIALIZAÇÃO
   ========================================================== */

console.log(
    "PostoCheck: app.js carregado."
);