/* =========================================================
   POSTOCHECK
   auditoria.js

   ESTRUTURA DO FIRESTORE:

   usuarios/
      {UID}/
         nomeEmpresa
         cnpj
         endereco

         perguntasAuditoria/
            {perguntaId}/
               pergunta
               ativo
               categoria
               ordem
               tipoResposta

         auditorias/
            {auditoriaId}/
               data
               auditor
               score
               yesCount
               noCount
               totalCount
               observacoes
               userId
               userEmail
               nomeEmpresa
               cnpj
               endereco
               createdAt

               respostas: {
                  {perguntaId}: {
                     tipoResposta
                     resposta
                     imagemBase64
                  }
               }

   TIPOS DE RESPOSTA:

      sim_nao
      texto
      imagem64
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    query,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import firebaseConfig from "./firebase-config.js";


/* =========================================================
   INICIALIZAÇÃO DO FIREBASE
========================================================= */

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================================
   ELEMENTOS DA PÁGINA
========================================================= */

const checklistElement =
    document.getElementById("checklist");

const auditDateInput =
    document.getElementById("auditDate");

const auditorNameInput =
    document.getElementById("auditorName");

const auditHistory =
    document.getElementById("auditHistory");

const observationsInput =
    document.getElementById("auditObservations");

const scoreValue =
    document.getElementById("scoreValue");

const scoreCircle =
    document.getElementById("scoreCircle");

const yesCountElement =
    document.getElementById("yesCount");

const noCountElement =
    document.getElementById("noCount");

const totalCountElement =
    document.getElementById("totalCount");

const generatePdfButton =
    document.getElementById("generatePdfButton");

const saveAuditButton =
    document.getElementById("saveAuditButton");

const auditMessage =
    document.getElementById("auditMessage");


/* =========================================================
   DADOS DA EMPRESA
========================================================= */

const companyNameElement =
    document.getElementById("companyName");

const companyCnpjElement =
    document.getElementById("companyCnpj");

const companyAddressElement =
    document.getElementById("companyAddress");


/* =========================================================
   CALENDÁRIO
========================================================= */

const calendarButton =
    document.getElementById("calendarButton");

const hiddenDatePicker =
    document.getElementById("hiddenDatePicker");


/* =========================================================
   VARIÁVEIS
========================================================= */

let currentUser = null;

let auditQuestions = [];

let currentAudit = null;

let companyData = {
    nomeEmpresa: "",
    cnpj: "",
    endereco: ""
};

let eventsConfigured = false;


/* =========================================================
   MENSAGEM
========================================================= */

function showMessage(message, type = "info") {

    if (!auditMessage) {
        return;
    }

    auditMessage.textContent =
        message;

    auditMessage.className =
        `audit-message ${type}`;
}


/* =========================================================
   DATA ATUAL - FORMATO ISO
========================================================= */

function getCurrentDateISO() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    return (
        `${year}-${month}-${day}`
    );
}


/* =========================================================
   DATA ISO -> BR
========================================================= */

function dateISOToBR(value) {

    if (!value) {
        return "";
    }

    const text =
        String(value).trim();


    const match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (!match) {

        /*
         * Caso já esteja em DD/MM/AAAA,
         * mantém.
         */

        if (
            /^\d{2}\/\d{2}\/\d{4}$/.test(
                text
            )
        ) {

            return text;
        }

        return "";
    }


    return (
        `${match[3]}/${match[2]}/${match[1]}`
    );
}


/* =========================================================
   DATA BR -> ISO
========================================================= */

function dateBRToISO(value) {

    if (!value) {
        return "";
    }

    const text =
        String(value).trim();


    const match =
        text.match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );


    if (!match) {
        return "";
    }


    const day =
        Number(match[1]);

    const month =
        Number(match[2]);

    const year =
        Number(match[3]);


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    /*
     * Verifica se a data realmente existe.
     */

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {

        return "";
    }


    return (
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
}


/* =========================================================
   MÁSCARA DA DATA
========================================================= */

function formatDateInput(value) {

    const numbers =
        String(value || "")
            .replace(/\D/g, "")
            .slice(0, 8);


    if (numbers.length <= 2) {

        return numbers;
    }


    if (numbers.length <= 4) {

        return (
            `${numbers.slice(0, 2)}/${numbers.slice(2)}`
        );
    }


    return (
        `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`
    );
}


/* =========================================================
   FORMATAR DATA PARA EXIBIÇÃO
========================================================= */

function formatDate(dateString) {

    if (!dateString) {
        return "";
    }


    const text =
        String(dateString).trim();


    /*
     * Firestore normalmente terá:
     * AAAA-MM-DD
     */

    const iso =
        dateISOToBR(text);


    if (iso) {
        return iso;
    }


    return text;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   ESCAPE PARA SELETOR CSS
========================================================= */

function escapeSelector(value) {

    if (
        window.CSS &&
        typeof CSS.escape === "function"
    ) {

        return CSS.escape(
            String(value)
        );
    }


    return String(value)
        .replace(
            /([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,
            "\\$1"
        );
}


/* =========================================================
   NORMALIZAR TIPO DE RESPOSTA
========================================================= */

function normalizeAnswerType(type) {

    const normalized =
        String(type || "sim_nao")
            .trim()
            .toLowerCase();


    if (
        normalized === "texto" ||
        normalized === "text"
    ) {

        return "texto";
    }


    if (
        normalized === "imagem64" ||
        normalized === "imagem" ||
        normalized === "image"
    ) {

        return "imagem64";
    }


    return "sim_nao";
}


/* =========================================================
   CONFIGURAR CALENDÁRIO
========================================================= */

function setupDatePicker() {

    if (
        !auditDateInput ||
        !hiddenDatePicker
    ) {

        return;
    }


    /*
     * Data inicial no campo visível.
     */

    auditDateInput.value =
        dateISOToBR(
            getCurrentDateISO()
        );


    /*
     * Configura o input type=date auxiliar.
     */

    hiddenDatePicker.type =
        "date";


    /*
     * Inicializa o calendário com a data atual.
     */

    hiddenDatePicker.value =
        getCurrentDateISO();


    /* -----------------------------------------------------
       DIGITAÇÃO MANUAL
    ----------------------------------------------------- */

    auditDateInput.addEventListener(
        "input",
        () => {

            auditDateInput.value =
                formatDateInput(
                    auditDateInput.value
                );


            currentAudit =
                null;
        }
    );


    /* -----------------------------------------------------
       ABRIR CALENDÁRIO
    ----------------------------------------------------- */

    if (calendarButton) {

        calendarButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();


                /*
                 * Se o usuário digitou uma data válida,
                 * usa essa data no calendário.
                 */

                const typedDate =
                    dateBRToISO(
                        auditDateInput.value
                    );


                if (typedDate) {

                    hiddenDatePicker.value =
                        typedDate;
                }


                /*
                 * showPicker() funciona nos
                 * navegadores modernos.
                 */

                if (
                    typeof hiddenDatePicker.showPicker ===
                    "function"
                ) {

                    try {

                        hiddenDatePicker.showPicker();

                        return;

                    } catch (error) {

                        console.warn(
                            "showPicker() não pôde ser utilizado:",
                            error
                        );
                    }
                }


                /*
                 * Fallback.
                 */

                hiddenDatePicker.focus();

                hiddenDatePicker.click();

            }
        );
    }


    /* -----------------------------------------------------
       DATA ESCOLHIDA NO CALENDÁRIO
    ----------------------------------------------------- */

    hiddenDatePicker.addEventListener(
        "change",
        () => {

            const selectedDate =
                hiddenDatePicker.value;


            if (!selectedDate) {
                return;
            }


            auditDateInput.value =
                dateISOToBR(
                    selectedDate
                );


            currentAudit =
                null;

        }
    );
}


/* =========================================================
   CARREGAR PERFIL DA EMPRESA

   usuarios/{UID}
========================================================= */

async function loadCompanyProfile() {

    if (!currentUser) {
        return;
    }


    try {

        const userReference =
            doc(
                db,
                "usuarios",
                currentUser.uid
            );


        const snapshot =
            await getDoc(
                userReference
            );


        if (snapshot.exists()) {

            const data =
                snapshot.data();


            companyData = {

                nomeEmpresa:
                    data.nomeEmpresa || "",

                cnpj:
                    data.cnpj || "",

                endereco:
                    data.endereco || ""

            };

        } else {

            companyData = {

                nomeEmpresa: "",
                cnpj: "",
                endereco: ""

            };
        }


        updateCompanyDisplay();


    } catch (error) {

        console.error(
            "Erro ao carregar perfil da empresa:",
            error
        );


        companyData = {

            nomeEmpresa: "",
            cnpj: "",
            endereco: ""

        };


        updateCompanyDisplay();


        showMessage(
            "Não foi possível carregar os dados da empresa.",
            "error"
        );
    }
}


/* =========================================================
   MOSTRAR DADOS DA EMPRESA
========================================================= */

function updateCompanyDisplay() {

    if (companyNameElement) {

        companyNameElement.textContent =
            companyData.nomeEmpresa ||
            "Não informado";
    }


    if (companyCnpjElement) {

        companyCnpjElement.textContent =
            companyData.cnpj ||
            "Não informado";
    }


    if (companyAddressElement) {

        companyAddressElement.textContent =
            companyData.endereco ||
            "Não informado";
    }
}


/* =========================================================
   CARREGAR PERGUNTAS

   usuarios/{UID}/perguntasAuditoria
========================================================= */

async function loadAuditQuestions() {

    if (
        !checklistElement ||
        !currentUser
    ) {

        return;
    }


    try {

        checklistElement.innerHTML = `
            <div class="loading-message">
                <span class="loading-spinner"></span>
                <span>Carregando perguntas...</span>
            </div>
        `;


        const questionsReference =
            collection(
                db,
                "usuarios",
                currentUser.uid,
                "perguntasAuditoria"
            );


        let snapshot;


        try {

            const questionsQuery =
                query(
                    questionsReference,
                    orderBy(
                        "ordem",
                        "asc"
                    )
                );


            snapshot =
                await getDocs(
                    questionsQuery
                );


        } catch (orderError) {

            console.warn(
                "Não foi possível ordenar as perguntas. Tentando sem orderBy.",
                orderError
            );


            snapshot =
                await getDocs(
                    questionsReference
                );
        }


        auditQuestions = [];


        snapshot.forEach(
            (documentSnapshot) => {

                const data =
                    documentSnapshot.data();


                if (data.ativo === false) {
                    return;
                }


                const question = {

                    id:
                        documentSnapshot.id,

                    pergunta:
                        data.pergunta || "",

                    ordem:
                        Number(
                            data.ordem ?? 9999
                        ),

                    categoria:
                        data.categoria || "",

                    tipoResposta:
                        normalizeAnswerType(
                            data.tipoResposta
                        )

                };


                auditQuestions.push(
                    question
                );
            }
        );


        auditQuestions.sort(
            (a, b) =>
                a.ordem - b.ordem
        );


        if (
            auditQuestions.length === 0
        ) {

            checklistElement.innerHTML = `
                <div class="empty-message">
                    Nenhuma pergunta de auditoria foi cadastrada.
                </div>
            `;


            updateScore();

            return;
        }


        renderChecklist();

        updateScore();


    } catch (error) {

        console.error(
            "Erro ao carregar perguntas:",
            error
        );


        checklistElement.innerHTML = `
            <div class="error-message">
                Não foi possível carregar as perguntas da auditoria.
            </div>
        `;


        showMessage(
            "Erro ao carregar as perguntas.",
            "error"
        );
    }
}


/* =========================================================
   RENDERIZAR CHECKLIST
========================================================= */

function renderChecklist() {

    if (!checklistElement) {
        return;
    }


    checklistElement.innerHTML = "";


    let lastCategory = "";


    auditQuestions.forEach(
        (question, index) => {

            if (
                question.categoria &&
                question.categoria !== lastCategory
            ) {

                const categoryElement =
                    document.createElement(
                        "div"
                    );


                categoryElement.className =
                    "checklist-category";


                categoryElement.textContent =
                    question.categoria;


                checklistElement.appendChild(
                    categoryElement
                );


                lastCategory =
                    question.categoria;
            }


            const questionCard =
                document.createElement(
                    "div"
                );


            questionCard.className =
                "checklist-question";


            questionCard.dataset.questionId =
                question.id;


            let answerHtml = "";


            /* =================================================
               SIM / NÃO
            ================================================= */

            if (
                question.tipoResposta ===
                "sim_nao"
            ) {

                answerHtml = `

                    <div class="question-answer">

                        <label class="answer-option yes-option">

                            <input
                                type="checkbox"
                                class="answer-checkbox"
                                data-question-id="${escapeHtml(question.id)}"
                                data-answer="SIM"
                            >

                            <span class="custom-checkbox"></span>

                            <span class="answer-text">
                                SIM
                            </span>

                        </label>


                        <label class="answer-option no-option">

                            <input
                                type="checkbox"
                                class="answer-checkbox"
                                data-question-id="${escapeHtml(question.id)}"
                                data-answer="NAO"
                            >

                            <span class="custom-checkbox"></span>

                            <span class="answer-text">
                                NÃO
                            </span>

                        </label>

                    </div>

                `;
            }


            /* =================================================
               TEXTO
            ================================================= */

            if (
                question.tipoResposta ===
                "texto"
            ) {

                answerHtml = `

                    <div class="question-text-answer">

                        <textarea
                            class="question-text-input"
                            data-question-id="${escapeHtml(question.id)}"
                            rows="4"
                            placeholder="Digite sua resposta..."
                        ></textarea>

                    </div>

                `;
            }


            /* =================================================
               IMAGEM
            ================================================= */

            if (
                question.tipoResposta ===
                "imagem64"
            ) {

                answerHtml = `

                    <div class="question-image-area">

                        <label class="image-upload-label">

                            <span>
                                📷 ADICIONAR IMAGEM
                            </span>

                            <input
                                type="file"
                                class="question-image-input"
                                data-question-id="${escapeHtml(question.id)}"
                                accept="image/*"
                                capture="environment"
                            >

                        </label>


                        <div
                            class="image-preview"
                            data-preview-id="${escapeHtml(question.id)}"
                        ></div>

                    </div>

                `;
            }


            questionCard.innerHTML = `

                <div class="question-header">

                    <span class="question-number">
                        ${index + 1}
                    </span>

                    <div class="question-content">

                        <p class="question-text">
                            ${escapeHtml(question.pergunta)}
                        </p>

                    </div>

                </div>

                ${answerHtml}

            `;


            checklistElement.appendChild(
                questionCard
            );
        }
    );


    addChecklistEvents();
}


/* =========================================================
   EVENTOS DO CHECKLIST
========================================================= */

function addChecklistEvents() {

    const checkboxes =
        document.querySelectorAll(
            ".answer-checkbox"
        );


    checkboxes.forEach(
        (checkbox) => {

            checkbox.addEventListener(
                "change",
                () => {

                    const questionId =
                        checkbox.dataset.questionId;


                    const answer =
                        checkbox.dataset.answer;


                    if (checkbox.checked) {

                        const otherAnswer =
                            answer === "SIM"
                                ? "NAO"
                                : "SIM";


                        const selector =
                            `.answer-checkbox[data-question-id="${escapeSelector(questionId)}"][data-answer="${otherAnswer}"]`;


                        const otherCheckbox =
                            document.querySelector(
                                selector
                            );


                        if (otherCheckbox) {

                            otherCheckbox.checked =
                                false;
                        }
                    }


                    updateScore();
                }
            );
        }
    );


    const textInputs =
        document.querySelectorAll(
            ".question-text-input"
        );


    textInputs.forEach(
        (input) => {

            input.addEventListener(
                "input",
                () => {

                    input.dataset.changed =
                        "true";
                }
            );
        }
    );


    const imageInputs =
        document.querySelectorAll(
            ".question-image-input"
        );


    imageInputs.forEach(
        (input) => {

            input.addEventListener(
                "change",
                handleImageUpload
            );
        }
    );
}


/* =========================================================
   UPLOAD / COMPRESSÃO DA IMAGEM
========================================================= */

async function handleImageUpload(event) {

    const input =
        event.target;


    const questionId =
        input.dataset.questionId;


    const file =
        input.files?.[0];


    if (!file) {
        return;
    }


    if (
        !file.type ||
        !file.type.startsWith("image/")
    ) {

        input.value = "";


        showMessage(
            "Selecione uma imagem válida.",
            "error"
        );


        return;
    }


    try {

        showMessage(
            "Processando imagem...",
            "info"
        );


        const base64 =
            await resizeImage(file);


        input.dataset.base64 =
            base64;


        const preview =
            document.querySelector(
                `[data-preview-id="${escapeSelector(questionId)}"]`
            );


        if (preview) {

            preview.innerHTML = `

                <div class="image-preview-item">

                    <img
                        src="${base64}"
                        alt="Imagem da auditoria"
                    >

                    <button
                        type="button"
                        class="remove-image-button"
                    >
                        REMOVER
                    </button>

                </div>

            `;


            const removeButton =
                preview.querySelector(
                    ".remove-image-button"
                );


            if (removeButton) {

                removeButton.addEventListener(
                    "click",
                    () => {

                        input.value = "";

                        delete input.dataset.base64;

                        preview.innerHTML = "";

                    }
                );
            }
        }


        showMessage(
            "Imagem adicionada.",
            "success"
        );


    } catch (error) {

        console.error(
            "Erro ao processar imagem:",
            error
        );


        input.value = "";

        delete input.dataset.base64;


        showMessage(
            "Não foi possível processar a imagem.",
            "error"
        );
    }
}


/* =========================================================
   REDIMENSIONAR IMAGEM
========================================================= */

function resizeImage(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload =
                (event) => {

                    const image =
                        new Image();


                    image.onload =
                        () => {

                            const maxWidth =
                                900;

                            const maxHeight =
                                700;


                            let width =
                                image.width;

                            let height =
                                image.height;


                            if (
                                width > maxWidth
                            ) {

                                height =
                                    height *
                                    (
                                        maxWidth /
                                        width
                                    );

                                width =
                                    maxWidth;
                            }


                            if (
                                height > maxHeight
                            ) {

                                width =
                                    width *
                                    (
                                        maxHeight /
                                        height
                                    );

                                height =
                                    maxHeight;
                            }


                            const canvas =
                                document.createElement(
                                    "canvas"
                                );


                            canvas.width =
                                Math.round(
                                    width
                                );


                            canvas.height =
                                Math.round(
                                    height
                                );


                            const context =
                                canvas.getContext(
                                    "2d"
                                );


                            if (!context) {

                                reject(
                                    new Error(
                                        "Não foi possível criar o canvas."
                                    )
                                );

                                return;
                            }


                            context.drawImage(
                                image,
                                0,
                                0,
                                canvas.width,
                                canvas.height
                            );


                            const base64 =
                                canvas.toDataURL(
                                    "image/jpeg",
                                    0.72
                                );


                            resolve(
                                base64
                            );
                        };


                    image.onerror =
                        () => {

                            reject(
                                new Error(
                                    "Imagem inválida."
                                )
                            );
                        };


                    image.src =
                        event.target.result;
                };


            reader.onerror =
                () => {

                    reject(
                        new Error(
                            "Erro ao ler imagem."
                        )
                    );
                };


            reader.readAsDataURL(file);
        }
    );
}


/* =========================================================
   PEGAR RESPOSTAS ATUAIS DA TELA
========================================================= */

function getCurrentAnswers() {

    const answers = {};


    auditQuestions.forEach(
        (question) => {

            /* =================================================
               SIM / NÃO
            ================================================= */

            if (
                question.tipoResposta ===
                "sim_nao"
            ) {

                const selected =
                    document.querySelector(
                        `.answer-checkbox[data-question-id="${escapeSelector(question.id)}"]:checked`
                    );


                answers[question.id] = {

                    tipoResposta:
                        "sim_nao",

                    resposta:
                        selected
                            ? selected.dataset.answer
                            : null,

                    imagemBase64:
                        ""

                };


                return;
            }


            /* =================================================
               TEXTO
            ================================================= */

            if (
                question.tipoResposta ===
                "texto"
            ) {

                const input =
                    document.querySelector(
                        `.question-text-input[data-question-id="${escapeSelector(question.id)}"]`
                    );


                answers[question.id] = {

                    tipoResposta:
                        "texto",

                    resposta:
                        input
                            ? input.value.trim()
                            : "",

                    imagemBase64:
                        ""

                };


                return;
            }


            /* =================================================
               IMAGEM
            ================================================= */

            if (
                question.tipoResposta ===
                "imagem64"
            ) {

                const input =
                    document.querySelector(
                        `.question-image-input[data-question-id="${escapeSelector(question.id)}"]`
                    );


                answers[question.id] = {

                    tipoResposta:
                        "imagem64",

                    resposta:
                        "",

                    imagemBase64:
                        input?.dataset.base64 || ""

                };
            }
        }
    );


    return answers;
}


/* =========================================================
   CALCULAR RESULTADO
========================================================= */

function calculateScore() {

    const answers =
        getCurrentAnswers();


    const scoreQuestions =
        auditQuestions.filter(
            (question) =>
                question.tipoResposta ===
                "sim_nao"
        );


    const total =
        scoreQuestions.length;


    let yes = 0;

    let no = 0;


    scoreQuestions.forEach(
        (question) => {

            const data =
                answers[question.id];


            if (!data) {
                return;
            }


            if (
                data.resposta ===
                "SIM"
            ) {

                yes++;

            } else if (
                data.resposta ===
                "NAO"
            ) {

                no++;
            }
        }
    );


    const score =
        total > 0
            ? Math.round(
                (yes / total) * 100
            )
            : 0;


    return {

        score,
        yes,
        no,
        total

    };
}


/* =========================================================
   ATUALIZAR RESULTADO
========================================================= */

function updateScore() {

    const result =
        calculateScore();


    if (scoreValue) {

        scoreValue.textContent =
            `${result.score}%`;
    }


    if (yesCountElement) {

        yesCountElement.textContent =
            result.yes;
    }


    if (noCountElement) {

        noCountElement.textContent =
            result.no;
    }


    if (totalCountElement) {

        totalCountElement.textContent =
            result.total;
    }


    if (scoreCircle) {

        scoreCircle.style.background =
            `conic-gradient(
                #f5c400 0% ${result.score}%,
                #e5e5e5 ${result.score}% 100%
            )`;
    }
}


/* =========================================================
   LIMPAR FORMULÁRIO
========================================================= */

function clearAuditForm() {

    currentAudit = null;


    if (auditDateInput) {

        auditDateInput.value =
            dateISOToBR(
                getCurrentDateISO()
            );
    }


    if (hiddenDatePicker) {

        hiddenDatePicker.value =
            getCurrentDateISO();
    }


    if (auditorNameInput) {

        auditorNameInput.value =
            "";
    }


    if (observationsInput) {

        observationsInput.value =
            "";
    }


    if (auditHistory) {

        auditHistory.value =
            "";
    }


    renderChecklist();

    updateScore();


    if (auditMessage) {

        auditMessage.textContent =
            "";

        auditMessage.className =
            "audit-message";
    }
}


/* =========================================================
   VALIDAR AUDITORIA
========================================================= */

function validateAudit() {

    if (!auditDateInput?.value) {

        showMessage(
            "Informe a data da auditoria.",
            "error"
        );


        auditDateInput?.focus();


        return false;
    }


    const isoDate =
        dateBRToISO(
            auditDateInput.value
        );


    if (!isoDate) {

        showMessage(
            "Informe uma data válida no formato DD/MM/AAAA.",
            "error"
        );


        auditDateInput?.focus();


        return false;
    }


    if (
        !auditorNameInput?.value.trim()
    ) {

        showMessage(
            "Informe o nome do auditor ou responsável.",
            "error"
        );


        auditorNameInput?.focus();


        return false;
    }


    if (
        auditQuestions.length === 0
    ) {

        showMessage(
            "Não existem perguntas cadastradas para este usuário.",
            "error"
        );


        return false;
    }


    const scoreQuestions =
        auditQuestions.filter(
            (question) =>
                question.tipoResposta ===
                "sim_nao"
        );


    if (
        scoreQuestions.length === 0
    ) {

        showMessage(
            "Não existem perguntas do tipo SIM/NÃO para calcular o resultado.",
            "error"
        );


        return false;
    }


    return true;
}


/* =========================================================
   SALVAR AUDITORIA
========================================================= */

async function saveAudit() {

    if (!validateAudit()) {
        return;
    }


    if (!currentUser) {

        showMessage(
            "Você precisa estar conectado para salvar.",
            "error"
        );


        return;
    }


    try {

        if (saveAuditButton) {

            saveAuditButton.disabled =
                true;

            saveAuditButton.textContent =
                "SALVANDO...";
        }


        const answers =
            getCurrentAnswers();


        const result =
            calculateScore();


        /*
         * Data armazenada sempre em:
         *
         * AAAA-MM-DD
         */

        const isoDate =
            dateBRToISO(
                auditDateInput.value
            );


        /*
         * =====================================================
         * DOCUMENTO DA AUDITORIA
         *
         * usuarios/{UID}/auditorias/{ID}
         * =====================================================
         */

        const auditsReference =
            collection(
                db,
                "usuarios",
                currentUser.uid,
                "auditorias"
            );


        const auditData = {

            data:
                isoDate,

            auditor:
                auditorNameInput.value.trim(),

            score:
                result.score,

            yesCount:
                result.yes,

            noCount:
                result.no,

            totalCount:
                result.total,

            observacoes:
                observationsInput?.value.trim() || "",

            userId:
                currentUser.uid,

            userEmail:
                currentUser.email || "",

            nomeEmpresa:
                companyData.nomeEmpresa || "",

            cnpj:
                companyData.cnpj || "",

            endereco:
                companyData.endereco || "",

            /*
             * RESPOSTAS COMO MAPA
             *
             * Não cria subcoleção.
             */

            respostas:
                answers,

            createdAt:
                serverTimestamp()

        };


        const auditDocument =
            await addDoc(
                auditsReference,
                auditData
            );


        currentAudit = {

            id:
                auditDocument.id,

            ...auditData

        };


        showMessage(
            "Auditoria salva com sucesso!",
            "success"
        );


        await loadAuditHistory();


    } catch (error) {

        console.error(
            "Erro ao salvar auditoria:",
            error
        );


        showMessage(
            getFirestoreErrorMessage(error),
            "error"
        );


    } finally {

        if (saveAuditButton) {

            saveAuditButton.disabled =
                false;

            saveAuditButton.textContent =
                "SALVAR NO FIREBASE";
        }
    }
}


/* =========================================================
   MENSAGENS DO FIRESTORE
========================================================= */

function getFirestoreErrorMessage(error) {

    if (!error) {

        return (
            "Erro ao salvar a auditoria."
        );
    }


    if (
        error.code ===
        "permission-denied"
    ) {

        return (
            "Permissão negada pelo Firebase. " +
            "Verifique as regras do Firestore."
        );
    }


    if (
        error.code ===
        "unavailable"
    ) {

        return (
            "Firebase temporariamente indisponível. " +
            "Verifique sua conexão."
        );
    }


    if (
        error.code ===
        "resource-exhausted"
    ) {

        return (
            "O tamanho dos dados ultrapassou o limite do Firestore. " +
            "A imagem em Base64 pode estar muito grande."
        );
    }


    return (
        "Erro ao salvar a auditoria no Firebase."
    );
}


/* =========================================================
   CARREGAR HISTÓRICO
========================================================= */

async function loadAuditHistory() {

    if (
        !auditHistory ||
        !currentUser
    ) {

        return;
    }


    try {

        auditHistory.innerHTML = `
            <option value="">
                Carregando auditorias...
            </option>
        `;


        const auditsReference =
            collection(
                db,
                "usuarios",
                currentUser.uid,
                "auditorias"
            );


        let snapshot;


        try {

            const auditsQuery =
                query(
                    auditsReference,
                    orderBy(
                        "createdAt",
                        "desc"
                    ),
                    limit(50)
                );


            snapshot =
                await getDocs(
                    auditsQuery
                );


        } catch (orderError) {

            console.warn(
                "Não foi possível ordenar pelo createdAt. Tentando sem orderBy.",
                orderError
            );


            snapshot =
                await getDocs(
                    auditsReference
                );
        }


        auditHistory.innerHTML = `
            <option value="">
                Nova auditoria
            </option>
        `;


        const documents = [];


        snapshot.forEach(
            (documentSnapshot) => {

                documents.push(
                    documentSnapshot
                );
            }
        );


        /*
         * Ordena pelo campo data.
         */

        documents.sort(
            (a, b) => {

                const dataA =
                    a.data().data || "";

                const dataB =
                    b.data().data || "";


                return String(dataB)
                    .localeCompare(
                        String(dataA)
                    );
            }
        );


        documents.forEach(
            (documentSnapshot) => {

                const data =
                    documentSnapshot.data();


                const date =
                    formatDate(
                        data.data
                    );


                const auditor =
                    data.auditor ||
                    "Sem responsável";


                const score =
                    data.score ?? 0;


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    documentSnapshot.id;


                option.textContent =
                    `${date} — ${auditor} — ${score}%`;


                auditHistory.appendChild(
                    option
                );
            }
        );


        if (
            documents.length === 0
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.disabled =
                true;


            option.textContent =
                "Nenhuma auditoria encontrada";


            auditHistory.appendChild(
                option
            );
        }


    } catch (error) {

        console.error(
            "Erro ao carregar histórico:",
            error
        );


        auditHistory.innerHTML = `
            <option value="">
                Não foi possível carregar o histórico
            </option>
        `;
    }
}


/* =========================================================
   CARREGAR AUDITORIA ESPECÍFICA
========================================================= */

async function loadAuditById(auditId) {

    if (
        !auditId ||
        !currentUser
    ) {

        clearAuditForm();

        return;
    }


    try {

        showMessage(
            "Carregando auditoria...",
            "info"
        );


        const auditReference =
            doc(
                db,
                "usuarios",
                currentUser.uid,
                "auditorias",
                auditId
            );


        const snapshot =
            await getDoc(
                auditReference
            );


        if (!snapshot.exists()) {

            showMessage(
                "Auditoria não encontrada.",
                "error"
            );


            return;
        }


        const data =
            snapshot.data();


        currentAudit = {

            id:
                snapshot.id,

            ...data

        };


        /*
         * DATA
         */

        if (auditDateInput) {

            auditDateInput.value =
                dateISOToBR(
                    data.data
                );
        }


        if (hiddenDatePicker) {

            hiddenDatePicker.value =
                data.data || "";
        }


        /*
         * AUDITOR
         */

        if (auditorNameInput) {

            auditorNameInput.value =
                data.auditor || "";
        }


        /*
         * OBSERVAÇÕES
         */

        if (observationsInput) {

            observationsInput.value =
                data.observacoes || "";
        }


        /*
         * =====================================================
         * RESPOSTAS
         *
         * NOVA ESTRUTURA:
         *
         * data.respostas
         *
         * =====================================================
         */

        const answers =
            data.respostas || {};


        /*
         * Renderiza as perguntas novamente.
         */

        renderChecklist();


        restoreAnswers(
            answers
        );


        updateScore();


        showMessage(
            "Auditoria carregada.",
            "success"
        );


    } catch (error) {

        console.error(
            "Erro ao carregar auditoria:",
            error
        );


        showMessage(
            "Erro ao carregar a auditoria.",
            "error"
        );
    }
}


/* =========================================================
   RESTAURAR RESPOSTAS
========================================================= */

function restoreAnswers(answers) {

    if (!answers) {
        return;
    }


    Object.entries(answers)
        .forEach(
            ([questionId, data]) => {

                if (!data) {
                    return;
                }


                const question =
                    auditQuestions.find(
                        (item) =>
                            item.id ===
                            questionId
                    );


                if (!question) {
                    return;
                }


                /* =================================================
                   SIM / NÃO
                ================================================= */

                if (
                    question.tipoResposta ===
                    "sim_nao"
                ) {

                    const answer =
                        data.resposta;


                    if (
                        answer === "SIM" ||
                        answer === "NAO"
                    ) {

                        const selector =
                            `.answer-checkbox[data-question-id="${escapeSelector(questionId)}"][data-answer="${answer}"]`;


                        const checkbox =
                            document.querySelector(
                                selector
                            );


                        if (checkbox) {

                            checkbox.checked =
                                true;
                        }
                    }
                }


                /* =================================================
                   TEXTO
                ================================================= */

                if (
                    question.tipoResposta ===
                    "texto"
                ) {

                    const input =
                        document.querySelector(
                            `.question-text-input[data-question-id="${escapeSelector(questionId)}"]`
                        );


                    if (input) {

                        input.value =
                            data.resposta || "";
                    }
                }


                /* =================================================
                   IMAGEM
                ================================================= */

                if (
                    question.tipoResposta ===
                    "imagem64"
                ) {

                    const image =
                        data.imagemBase64 ||
                        data.resposta ||
                        "";


                    if (!image) {
                        return;
                    }


                    const input =
                        document.querySelector(
                            `.question-image-input[data-question-id="${escapeSelector(questionId)}"]`
                        );


                    const preview =
                        document.querySelector(
                            `[data-preview-id="${escapeSelector(questionId)}"]`
                        );


                    if (input) {

                        input.dataset.base64 =
                            image;
                    }


                    if (preview) {

                        preview.innerHTML = `

                            <div class="image-preview-item">

                                <img
                                    src="${image}"
                                    alt="Imagem da auditoria"
                                >

                                <button
                                    type="button"
                                    class="remove-image-button"
                                >
                                    REMOVER
                                </button>

                            </div>

                        `;


                        const removeButton =
                            preview.querySelector(
                                ".remove-image-button"
                            );


                        if (removeButton) {

                            removeButton.addEventListener(
                                "click",
                                () => {

                                    if (input) {

                                        input.value =
                                            "";

                                        delete input.dataset.base64;
                                    }


                                    preview.innerHTML =
                                        "";

                                }
                            );
                        }
                    }
                }
            }
        );
}


/* =========================================================
   GERAR PDF
========================================================= */

async function generatePdf() {

    if (!validateAudit()) {
        return;
    }


    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        showMessage(
            "A biblioteca do PDF não foi carregada.",
            "error"
        );


        return;
    }


    try {

        if (generatePdfButton) {

            generatePdfButton.disabled =
                true;

            generatePdfButton.textContent =
                "GERANDO PDF...";
        }


        const { jsPDF } =
            window.jspdf;


        const pdf =
            new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });


        const answers =
            getCurrentAnswers();


        const result =
            calculateScore();


        const pageWidth =
            pdf.internal.pageSize.getWidth();


        const pageHeight =
            pdf.internal.pageSize.getHeight();


        let y = 18;


        /* =================================================
           CABEÇALHO
        ================================================== */

        pdf.setFontSize(20);

        pdf.setFont(
            undefined,
            "bold"
        );


        pdf.text(
            "POSTOCHECK",
            20,
            y
        );


        y += 9;


        pdf.setFontSize(15);


        pdf.text(
            "Auditoria do posto",
            20,
            y
        );


        y += 10;


        pdf.setFontSize(10);


        pdf.setFont(
            undefined,
            "normal"
        );


        if (companyData.nomeEmpresa) {

            pdf.text(
                `Empresa: ${companyData.nomeEmpresa}`,
                20,
                y
            );


            y += 5;
        }


        if (companyData.cnpj) {

            pdf.text(
                `CNPJ: ${companyData.cnpj}`,
                20,
                y
            );


            y += 5;
        }


        if (companyData.endereco) {

            const addressLines =
                pdf.splitTextToSize(
                    `Endereço: ${companyData.endereco}`,
                    pageWidth - 40
                );


            pdf.text(
                addressLines,
                20,
                y
            );


            y +=
                addressLines.length * 5;
        }


        y += 3;


        pdf.text(
            `Data: ${auditDateInput.value}`,
            20,
            y
        );


        y += 5;


        pdf.text(
            `Auditor / Responsável: ${auditorNameInput.value.trim()}`,
            20,
            y
        );


        y += 10;


        /* =================================================
           RESULTADO
        ================================================== */

        pdf.setFontSize(14);


        pdf.setFont(
            undefined,
            "bold"
        );


        pdf.text(
            `Resultado: ${result.score}%`,
            20,
            y
        );


        y += 6;


        pdf.setFontSize(10);


        pdf.setFont(
            undefined,
            "normal"
        );


        pdf.text(
            `SIM: ${result.yes}    NÃO: ${result.no}    TOTAL: ${result.total}`,
            20,
            y
        );


        y += 10;


        pdf.line(
            20,
            y,
            pageWidth - 20,
            y
        );


        y += 8;


        /* =================================================
           PERGUNTAS
        ================================================== */

        for (
            let index = 0;
            index < auditQuestions.length;
            index++
        ) {

            const question =
                auditQuestions[index];


            const answerData =
                answers[question.id] ||
                {};


            if (
                y > pageHeight - 35
            ) {

                pdf.addPage();

                y = 20;
            }


            pdf.setFontSize(10);


            pdf.setFont(
                undefined,
                "bold"
            );


            const questionLines =
                pdf.splitTextToSize(
                    `${index + 1}. ${question.pergunta}`,
                    pageWidth - 40
                );


            pdf.text(
                questionLines,
                20,
                y
            );


            y +=
                questionLines.length * 5;


            pdf.setFont(
                undefined,
                "normal"
            );


            let answerText =
                "NÃO RESPONDIDO";


            if (
                question.tipoResposta ===
                "sim_nao"
            ) {

                if (
                    answerData.resposta ===
                    "SIM"
                ) {

                    answerText =
                        "SIM";

                } else if (
                    answerData.resposta ===
                    "NAO"
                ) {

                    answerText =
                        "NÃO";
                }
            }


            if (
                question.tipoResposta ===
                "texto"
            ) {

                answerText =
                    answerData.resposta ||
                    "Não informado";
            }


            if (
                question.tipoResposta ===
                "imagem64"
            ) {

                answerText =
                    answerData.imagemBase64
                        ? "Imagem anexada"
                        : "Nenhuma imagem anexada";
            }


            const answerLines =
                pdf.splitTextToSize(
                    `Resposta: ${answerText}`,
                    pageWidth - 50
                );


            pdf.text(
                answerLines,
                25,
                y
            );


            y +=
                answerLines.length * 5 +
                5;


            /* =================================================
               IMAGEM
            ================================================== */

            if (
                question.tipoResposta ===
                "imagem64" &&
                answerData.imagemBase64
            ) {

                try {

                    const imageWidth =
                        80;


                    const imageHeight =
                        60;


                    if (
                        y + imageHeight >
                        pageHeight - 20
                    ) {

                        pdf.addPage();

                        y = 20;
                    }


                    pdf.addImage(
                        answerData.imagemBase64,
                        "JPEG",
                        25,
                        y,
                        imageWidth,
                        imageHeight
                    );


                    y +=
                        imageHeight + 8;


                } catch (imageError) {

                    console.error(
                        "Erro ao inserir imagem no PDF:",
                        imageError
                    );


                    y += 3;
                }
            }
        }


        /* =================================================
           OBSERVAÇÕES
        ================================================== */

        if (
            y > pageHeight - 45
        ) {

            pdf.addPage();

            y = 20;
        }


        y += 5;


        pdf.setFontSize(12);


        pdf.setFont(
            undefined,
            "bold"
        );


        pdf.text(
            "Observações",
            20,
            y
        );


        y += 7;


        pdf.setFontSize(10);


        pdf.setFont(
            undefined,
            "normal"
        );


        const observations =
            observationsInput?.value.trim() ||
            "Nenhuma observação registrada.";


        const observationLines =
            pdf.splitTextToSize(
                observations,
                pageWidth - 40
            );


        pdf.text(
            observationLines,
            20,
            y
        );


        /* =================================================
           RODAPÉ
        ================================================== */

        const totalPages =
            pdf.internal.getNumberOfPages();


        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            pdf.setPage(page);


            pdf.setFontSize(8);


            pdf.setFont(
                undefined,
                "normal"
            );


            pdf.text(
                `PostoCheck - Página ${page} de ${totalPages}`,
                20,
                pageHeight - 10
            );
        }


        const safeDate =
            auditDateInput.value
                .replaceAll("/", "-");


        const fileName =
            `auditoria-${safeDate || "data"}.pdf`;


        pdf.save(
            fileName
        );


        showMessage(
            "PDF gerado com sucesso.",
            "success"
        );


    } catch (error) {

        console.error(
            "Erro ao gerar PDF:",
            error
        );


        showMessage(
            "Não foi possível gerar o PDF.",
            "error"
        );


    } finally {

        if (generatePdfButton) {

            generatePdfButton.disabled =
                false;

            generatePdfButton.textContent =
                "GERAR PDF";
        }
    }
}


/* =========================================================
   EVENTOS PRINCIPAIS
========================================================= */

function setupEvents() {

    if (eventsConfigured) {
        return;
    }


    eventsConfigured = true;


    /* =================================================
       CALENDÁRIO
    ================================================== */

    setupDatePicker();


    /* =================================================
       PDF
    ================================================== */

    if (generatePdfButton) {

        generatePdfButton.addEventListener(
            "click",
            generatePdf
        );
    }


    /* =================================================
       SALVAR
    ================================================== */

    if (saveAuditButton) {

        saveAuditButton.addEventListener(
            "click",
            saveAudit
        );
    }


    /* =================================================
       HISTÓRICO
    ================================================== */

    if (auditHistory) {

        auditHistory.addEventListener(
            "change",
            async () => {

                const auditId =
                    auditHistory.value;


                if (!auditId) {

                    clearAuditForm();

                    return;
                }


                await loadAuditById(
                    auditId
                );
            }
        );
    }
}


/* =========================================================
   AUTENTICAÇÃO / INICIALIZAÇÃO
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        /*
         * Usuário não autenticado:
         * volta para o login.
         */

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        currentUser =
            user;


        /*
         * Configura eventos somente uma vez.
         */

        setupEvents();


        /*
         * Carrega dados da empresa.
         */

        await loadCompanyProfile();


        /*
         * Carrega perguntas:

         * usuarios/{UID}/perguntasAuditoria
         */

        await loadAuditQuestions();


        /*
         * Carrega histórico:

         * usuarios/{UID}/auditorias
         */

        await loadAuditHistory();


        /*
         * Garante a data inicial.
         */

        if (
            auditDateInput &&
            !auditDateInput.value
        ) {

            auditDateInput.value =
                dateISOToBR(
                    getCurrentDateISO()
                );
        }


        if (
            hiddenDatePicker &&
            !hiddenDatePicker.value
        ) {

            hiddenDatePicker.value =
                getCurrentDateISO();
        }

    }
);

