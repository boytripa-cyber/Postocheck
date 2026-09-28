/* =========================================================
   POSTOCHECK
   auditoria.js

   VERSÃO AJUSTADA

   PRINCIPAIS CORREÇÕES:

   1. Auditorias salvas ficam somente para consulta.
   2. Auditorias históricas não podem ser alteradas.
   3. Auditoria aberta no histórico pode gerar PDF.
   4. O PDF usa diretamente os dados da auditoria carregada.
   5. jsPDF é carregado automaticamente.
   6. Existe fallback para outro CDN caso o primeiro falhe.
   7. O botão GERAR PDF nunca fica preso em "GERANDO PDF".
   8. PDF funciona para auditoria nova e histórica.
   9. Respostas SIM/NÃO, texto, imagens e observações
      são incluídos no PDF.
   10. Compatível com navegador de smartphone.
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
   FIREBASE
========================================================= */

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const db =
    getFirestore(app);


/* =========================================================
   ELEMENTOS
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

const auditStatus =
    document.getElementById("auditStatus");


/* =========================================================
   EMPRESA
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

let pdfLibraryPromise = null;


/*
 * false = nova auditoria
 * true  = auditoria já salva / somente consulta
 */
let isHistoricalAudit = false;


/* =========================================================
   MENSAGENS
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    if (!auditMessage) {
        return;
    }

    auditMessage.textContent =
        message;

    auditMessage.className =
        `audit-message ${type}`;
}


/* =========================================================
   DATA ATUAL
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

    return `${year}-${month}-${day}`;
}


/* =========================================================
   ISO -> BR
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
   BR -> ISO
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
   FORMATAR DATA
========================================================= */

function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const text =
        String(dateString).trim();

    return (
        dateISOToBR(text) ||
        text
    );
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
   ESCAPE CSS
========================================================= */

function escapeSelector(value) {

    if (
        window.CSS &&
        typeof window.CSS.escape === "function"
    ) {

        return window.CSS.escape(
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
   NORMALIZAR TIPO
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
   STATUS DA AUDITORIA
========================================================= */

function updateAuditStatus() {

    if (!auditStatus) {
        return;
    }

    if (isHistoricalAudit) {

        auditStatus.textContent =
            "AUDITORIA REALIZADA — SOMENTE CONSULTA";

        auditStatus.classList.add(
            "historical"
        );

        auditStatus.classList.remove(
            "new"
        );

    } else {

        auditStatus.textContent =
            "NOVA AUDITORIA — PREENCHIMENTO LIBERADO";

        auditStatus.classList.add(
            "new"
        );

        auditStatus.classList.remove(
            "historical"
        );
    }
}


/* =========================================================
   BLOQUEAR / LIBERAR FORMULÁRIO
========================================================= */

function setAuditReadOnly(readOnly) {

    isHistoricalAudit =
        Boolean(readOnly);


    /*
     * DATA
     */
    if (auditDateInput) {

        auditDateInput.readOnly =
            true;

        auditDateInput.disabled =
            false;
    }


    /*
     * CALENDÁRIO
     */
    if (calendarButton) {

        calendarButton.disabled =
            isHistoricalAudit;
    }

    if (hiddenDatePicker) {

        hiddenDatePicker.disabled =
            isHistoricalAudit;
    }


    /*
     * AUDITOR
     */
    if (auditorNameInput) {

        auditorNameInput.disabled =
            isHistoricalAudit;
    }


    /*
     * OBSERVAÇÕES
     */
    if (observationsInput) {

        observationsInput.disabled =
            isHistoricalAudit;
    }


    /*
     * BOTÃO SALVAR
     */
    if (saveAuditButton) {

        saveAuditButton.disabled =
            isHistoricalAudit;

        saveAuditButton.textContent =
            isHistoricalAudit
                ? "AUDITORIA JÁ SALVA"
                : "SALVAR";
    }


    /*
     * BOTÃO PDF
     *
     * IMPORTANTE:
     * PDF permanece sempre liberado.
     */
    if (generatePdfButton) {

        generatePdfButton.disabled =
            false;

        generatePdfButton.textContent =
            "GERAR PDF";
    }


    /*
     * CHECKLIST
     */
    if (checklistElement) {

        const controls =
            checklistElement.querySelectorAll(
                "input, textarea, select, button"
            );

        controls.forEach(
            (control) => {

                control.disabled =
                    isHistoricalAudit;
            }
        );

        checklistElement.classList.toggle(
            "checklist-readonly",
            isHistoricalAudit
        );
    }


    updateAuditStatus();
}


/* =========================================================
   CALENDÁRIO
========================================================= */

function setupDatePicker() {

    if (
        !auditDateInput ||
        !hiddenDatePicker
    ) {
        return;
    }

    if (!auditDateInput.value) {

        auditDateInput.value =
            dateISOToBR(
                getCurrentDateISO()
            );
    }

    hiddenDatePicker.type =
        "date";

    if (!hiddenDatePicker.value) {

        hiddenDatePicker.value =
            getCurrentDateISO();
    }

    auditDateInput.readOnly =
        true;


    auditDateInput.addEventListener(
        "keydown",
        (event) => {

            event.preventDefault();
        }
    );


    auditDateInput.addEventListener(
        "paste",
        (event) => {

            event.preventDefault();
        }
    );


    if (calendarButton) {

        calendarButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                if (isHistoricalAudit) {

                    showMessage(
                        "Auditorias já realizadas são somente para consulta.",
                        "info"
                    );

                    return;
                }

                hiddenDatePicker.value =
                    dateBRToISO(
                        auditDateInput.value
                    ) ||
                    getCurrentDateISO();

                if (
                    typeof hiddenDatePicker.showPicker ===
                    "function"
                ) {

                    try {

                        hiddenDatePicker.showPicker();

                        return;

                    } catch (error) {

                        console.warn(
                            "showPicker não disponível:",
                            error
                        );
                    }
                }

                hiddenDatePicker.focus();
                hiddenDatePicker.click();
            }
        );
    }


    hiddenDatePicker.addEventListener(
        "change",
        () => {

            if (isHistoricalAudit) {
                return;
            }

            if (!hiddenDatePicker.value) {
                return;
            }

            auditDateInput.value =
                dateISOToBR(
                    hiddenDatePicker.value
                );
        }
    );
}


/* =========================================================
   CARREGAR EMPRESA
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
            "Erro ao carregar empresa:",
            error
        );

        updateCompanyDisplay();

        showMessage(
            "Não foi possível carregar os dados da empresa.",
            "error"
        );
    }
}


/* =========================================================
   MOSTRAR EMPRESA
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

        } catch (error) {

            console.warn(
                "Falha no orderBy das perguntas:",
                error
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

                auditQuestions.push({

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
                });
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

        setAuditReadOnly(
            isHistoricalAudit
        );

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


            /*
             * SIM / NÃO
             */
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


            /*
             * TEXTO
             */
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


            /*
             * IMAGEM
             */
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


    setAuditReadOnly(
        isHistoricalAudit
    );
}


/* =========================================================
   EVENTOS CHECKLIST
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

                    if (isHistoricalAudit) {
                        return;
                    }

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

                    if (isHistoricalAudit) {
                        return;
                    }

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
   UPLOAD IMAGEM
========================================================= */

async function handleImageUpload(event) {

    if (isHistoricalAudit) {

        event.target.value = "";

        return;
    }

    const input =
        event.target;

    const file =
        input.files?.[0];

    if (!file) {
        return;
    }

    const questionId =
        input.dataset.questionId;


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
                        src="${escapeHtml(base64)}"
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

                        if (isHistoricalAudit) {
                            return;
                        }

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
                                Math.round(width);

                            canvas.height =
                                Math.round(height);


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
   PEGAR RESPOSTAS DA TELA
========================================================= */

function getCurrentAnswers() {

    const answers = {};


    auditQuestions.forEach(
        (question) => {

            /*
             * SIM / NÃO
             */
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


            /*
             * TEXTO
             */
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


            /*
             * IMAGEM
             */
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
   CALCULAR SCORE
========================================================= */

function calculateScoreFromAnswers(answers = {}) {

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
                answers?.[question.id];

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
   CALCULAR SCORE ATUAL
========================================================= */

function calculateScore() {

    return calculateScoreFromAnswers(
        getCurrentAnswers()
    );
}


/* =========================================================
   ATUALIZAR SCORE
========================================================= */

function updateScore() {

    /*
     * Se estamos visualizando uma auditoria salva,
     * usamos o resultado salvo no Firebase.
     */
    if (
        isHistoricalAudit &&
        currentAudit
    ) {

        const score =
            Number(
                currentAudit.score ?? 0
            );

        const yes =
            Number(
                currentAudit.yesCount ?? 0
            );

        const no =
            Number(
                currentAudit.noCount ?? 0
            );

        const total =
            Number(
                currentAudit.totalCount ?? 0
            );


        if (scoreValue) {
            scoreValue.textContent =
                `${score}%`;
        }

        if (yesCountElement) {
            yesCountElement.textContent =
                yes;
        }

        if (noCountElement) {
            noCountElement.textContent =
                no;
        }

        if (totalCountElement) {
            totalCountElement.textContent =
                total;
        }

        if (scoreCircle) {

            scoreCircle.style.background =
                `conic-gradient(
                    #f5c400 0% ${score}%,
                    #e5e5e5 ${score}% 100%
                )`;
        }

        return;
    }


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
   NOVA AUDITORIA
========================================================= */

function clearAuditForm() {

    currentAudit = null;

    isHistoricalAudit = false;


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

        auditorNameInput.disabled =
            false;
    }


    if (observationsInput) {

        observationsInput.value =
            "";

        observationsInput.disabled =
            false;
    }


    renderChecklist();

    updateScore();

    setAuditReadOnly(false);


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

    if (isHistoricalAudit) {

        showMessage(
            "Esta auditoria já foi realizada e está disponível somente para consulta.",
            "info"
        );

        return false;
    }


    if (!auditDateInput?.value) {

        showMessage(
            "Informe a data da auditoria.",
            "error"
        );

        return false;
    }


    const isoDate =
        dateBRToISO(
            auditDateInput.value
        );


    if (!isoDate) {

        showMessage(
            "A data da auditoria é inválida.",
            "error"
        );

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

    if (isHistoricalAudit) {

        showMessage(
            "Auditorias já realizadas não podem ser editadas ou salvas novamente.",
            "info"
        );

        return;
    }


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


        const isoDate =
            dateBRToISO(
                auditDateInput.value
            );


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


        /*
         * Auditoria salva passa para consulta.
         */
        setAuditReadOnly(true);


        await loadAuditHistory();


        if (auditHistory) {

            auditHistory.value =
                auditDocument.id;
        }


        showMessage(
            "Auditoria salva com sucesso. Ela agora está disponível somente para consulta.",
            "success"
        );

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
                isHistoricalAudit;

            saveAuditButton.textContent =
                isHistoricalAudit
                    ? "AUDITORIA JÁ SALVA"
                    : "SALVAR";
        }
    }
}


/* =========================================================
   ERROS FIRESTORE
========================================================= */

function getFirestoreErrorMessage(error) {

    if (!error) {
        return "Erro ao salvar a auditoria.";
    }


    if (
        error.code ===
        "permission-denied"
    ) {

        return (
            "Permissão negada pelo Firebase. Verifique as regras do Firestore."
        );
    }


    if (
        error.code ===
        "unavailable"
    ) {

        return (
            "Firebase temporariamente indisponível. Verifique sua conexão."
        );
    }


    if (
        error.code ===
        "resource-exhausted"
    ) {

        return (
            "O tamanho dos dados ultrapassou o limite do Firestore. A imagem pode estar muito grande."
        );
    }


    if (
        error.code ===
        "failed-precondition"
    ) {

        return (
            "O Firebase solicitou um índice para esta consulta."
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

        } catch (error) {

            console.warn(
                "Não foi possível ordenar pelo createdAt:",
                error
            );

            snapshot =
                await getDocs(
                    auditsReference
                );
        }


        const documents = [];


        snapshot.forEach(
            (documentSnapshot) => {

                documents.push(
                    documentSnapshot
                );
            }
        );


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


        auditHistory.innerHTML = `
            <option value="">
                Nova auditoria
            </option>
        `;


        documents
            .slice(0, 50)
            .forEach(
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

        /*
         * Bloqueia imediatamente enquanto carrega.
         */
        setAuditReadOnly(true);


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


        /*
         * ESTA É A AUDITORIA REAL QUE SERÁ USADA
         * NA GERAÇÃO DO PDF.
         */
        currentAudit = {

            id:
                snapshot.id,

            ...data
        };


        isHistoricalAudit =
            true;


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
         * CHECKLIST
         */
        renderChecklist();


        /*
         * RESPOSTAS
         */
        restoreAnswers(
            data.respostas || {}
        );


        /*
         * SCORE
         */
        updateScore();


        /*
         * BLOQUEIA NOVAMENTE
         */
        setAuditReadOnly(true);


        showMessage(
            "Auditoria carregada somente para consulta.",
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


                /*
                 * SIM / NÃO
                 */
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


                /*
                 * TEXTO
                 */
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


                /*
                 * IMAGEM
                 */
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
                                    src="${escapeHtml(image)}"
                                    alt="Imagem da auditoria"
                                >

                                <button
                                    type="button"
                                    class="remove-image-button"
                                    disabled
                                >
                                    REMOVER
                                </button>

                            </div>
                        `;
                    }
                }
            }
        );


    setAuditReadOnly(
        isHistoricalAudit
    );
}


/* =========================================================
   AGUARDAR JSPDF
========================================================= */

function waitForJsPdf(
    timeout = 4000
) {

    return new Promise(
        (resolve) => {

            const start =
                Date.now();


            const timer =
                setInterval(
                    () => {

                        if (
                            window.jspdf &&
                            typeof window.jspdf.jsPDF ===
                            "function"
                        ) {

                            clearInterval(timer);

                            resolve(
                                window.jspdf.jsPDF
                            );

                            return;
                        }


                        if (
                            Date.now() - start >=
                            timeout
                        ) {

                            clearInterval(timer);

                            resolve(null);
                        }

                    },
                    100
                );
        }
    );
}


/* =========================================================
   CARREGAR SCRIPT EXTERNO
========================================================= */

function loadScript(url) {

    return new Promise(
        (resolve, reject) => {

            const script =
                document.createElement(
                    "script"
                );


            script.src =
                url;

            script.async =
                true;

            script.onload =
                () => {

                    resolve();
                };

            script.onerror =
                () => {

                    reject(
                        new Error(
                            `Não foi possível carregar: ${url}`
                        )
                    );
                };


            document.head.appendChild(
                script
            );
        }
    );
}


/* =========================================================
   GARANTIR JSPDF
========================================================= */

async function ensureJsPdf() {

    /*
     * 1. Já carregado.
     */
    if (
        window.jspdf &&
        typeof window.jspdf.jsPDF ===
        "function"
    ) {

        return window.jspdf.jsPDF;
    }


    /*
     * Evita duas cargas simultâneas.
     */
    if (pdfLibraryPromise) {

        return await pdfLibraryPromise;
    }


    pdfLibraryPromise =
        (async () => {

            /*
             * 2. Dá alguns segundos para o script
             * que já está no HTML terminar de carregar.
             */
            const existing =
                await waitForJsPdf(4000);


            if (existing) {
                return existing;
            }


            /*
             * 3. Primeiro CDN.
             */
            const cdnList = [

                "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js",

                "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js"
            ];


            for (
                const url of cdnList
            ) {

                try {

                    /*
                     * Não adiciona novamente o mesmo
                     * script do HTML.
                     */
                    const alreadyExists =
                        Array.from(
                            document.scripts
                        ).some(
                            (script) =>
                                script.src ===
                                url
                        );


                    if (!alreadyExists) {

                        await loadScript(
                            url
                        );
                    }


                    const loaded =
                        await waitForJsPdf(
                            3000
                        );


                    if (loaded) {

                        return loaded;
                    }

                } catch (error) {

                    console.warn(
                        "Falha ao carregar jsPDF:",
                        url,
                        error
                    );
                }
            }


            throw new Error(
                "Não foi possível carregar a biblioteca jsPDF."
            );

        })();


    try {

        return await pdfLibraryPromise;

    } finally {

        pdfLibraryPromise =
            null;
    }
}


/* =========================================================
   OBTER DADOS PARA PDF
========================================================= */

function getAuditDataForPdf() {

    /*
     * =====================================================
     * AUDITORIA HISTÓRICA
     *
     * Aqui usamos diretamente o objeto carregado
     * do Firebase.
     * =====================================================
     */

    if (
        isHistoricalAudit &&
        currentAudit
    ) {

        return {

            data:
                currentAudit.data || "",

            auditor:
                currentAudit.auditor || "",

            score:
                Number(
                    currentAudit.score ?? 0
                ),

            yesCount:
                Number(
                    currentAudit.yesCount ?? 0
                ),

            noCount:
                Number(
                    currentAudit.noCount ?? 0
                ),

            totalCount:
                Number(
                    currentAudit.totalCount ?? 0
                ),

            observacoes:
                currentAudit.observacoes || "",

            nomeEmpresa:
                currentAudit.nomeEmpresa ||
                companyData.nomeEmpresa ||
                "",

            cnpj:
                currentAudit.cnpj ||
                companyData.cnpj ||
                "",

            endereco:
                currentAudit.endereco ||
                companyData.endereco ||
                "",

            respostas:
                currentAudit.respostas ||
                {}
        };
    }


    /*
     * =====================================================
     * NOVA AUDITORIA
     *
     * Aqui usamos o formulário atual.
     * =====================================================
     */

    const respostas =
        getCurrentAnswers();


    const result =
        calculateScoreFromAnswers(
            respostas
        );


    return {

        data:
            dateBRToISO(
                auditDateInput?.value || ""
            ),

        auditor:
            auditorNameInput?.value.trim() ||
            "",

        score:
            result.score,

        yesCount:
            result.yes,

        noCount:
            result.no,

        totalCount:
            result.total,

        observacoes:
            observationsInput?.value.trim() ||
            "",

        nomeEmpresa:
            companyData.nomeEmpresa ||
            "",

        cnpj:
            companyData.cnpj ||
            "",

        endereco:
            companyData.endereco ||
            "",

        respostas
    };
}


/* =========================================================
   GERAR PDF
========================================================= */

async function generatePdf() {

    /*
     * Guardamos a auditoria ANTES de iniciar o processo.
     * Isso evita qualquer alteração durante a geração.
     */
    const auditForPdf =
        getAuditDataForPdf();


    /*
     * Bloqueia somente o botão.
     * O restante da auditoria continua intacto.
     */
    if (generatePdfButton) {

        generatePdfButton.disabled =
            true;

        generatePdfButton.textContent =
            "GERANDO PDF...";
    }


    try {

        showMessage(
            "Preparando o PDF...",
            "info"
        );


        /*
         * =================================================
         * CARREGA JSPDF
         * =================================================
         */

        const jsPDF =
            await ensureJsPdf();


        if (
            typeof jsPDF !== "function"
        ) {

            throw new Error(
                "A biblioteca jsPDF não está disponível."
            );
        }


        /*
         * =================================================
         * DATA
         * =================================================
         */

        const dateISO =
            auditForPdf.data;


        if (!dateISO) {

            throw new Error(
                "A auditoria não possui uma data válida."
            );
        }


        const dateBR =
            formatDate(
                dateISO
            );


        /*
         * =================================================
         * RESPOSTAS
         * =================================================
         */

        const answers =
            auditForPdf.respostas ||
            {};


        /*
         * =================================================
         * CRIAR PDF
         * =================================================
         */

        const pdf =
            new jsPDF({

                orientation:
                    "portrait",

                unit:
                    "mm",

                format:
                    "a4"
            });


        const pageWidth =
            pdf.internal.pageSize.getWidth();

        const pageHeight =
            pdf.internal.pageSize.getHeight();


        let y = 18;


        /* =================================================
           NOVA PÁGINA
        ================================================= */

        function ensureSpace(
            requiredHeight = 20
        ) {

            if (
                y + requiredHeight >
                pageHeight - 18
            ) {

                pdf.addPage();

                y = 20;
            }
        }


        /* =================================================
           TEXTO QUEBRADO
        ================================================= */

        function writeWrapped(
            text,
            x,
            fontSize = 10,
            lineHeight = 5,
            maxWidth = pageWidth - 40
        ) {

            const safeText =
                String(
                    text || ""
                );


            pdf.setFontSize(
                fontSize
            );


            const lines =
                pdf.splitTextToSize(
                    safeText,
                    maxWidth
                );


            lines.forEach(
                (line) => {

                    ensureSpace(
                        lineHeight + 2
                    );

                    pdf.text(
                        line,
                        x,
                        y
                    );

                    y +=
                        lineHeight;
                }
            );


            return lines.length;
        }


        /* =================================================
           CABEÇALHO
        ================================================= */

        pdf.setFont(
            undefined,
            "bold"
        );

        pdf.setFontSize(
            20
        );

        pdf.text(
            "POSTOCHECK",
            20,
            y
        );

        y += 9;


        pdf.setFontSize(
            14
        );

        pdf.text(
            "RELATÓRIO DE AUDITORIA",
            20,
            y
        );

        y += 10;


        pdf.setFont(
            undefined,
            "normal"
        );


        /* =================================================
           EMPRESA
        ================================================= */

        if (
            auditForPdf.nomeEmpresa
        ) {

            writeWrapped(
                `Empresa: ${auditForPdf.nomeEmpresa}`,
                20,
                10,
                5
            );
        }


        if (
            auditForPdf.cnpj
        ) {

            writeWrapped(
                `CNPJ: ${auditForPdf.cnpj}`,
                20,
                10,
                5
            );
        }


        if (
            auditForPdf.endereco
        ) {

            writeWrapped(
                `Endereço: ${auditForPdf.endereco}`,
                20,
                10,
                5
            );
        }


        y += 2;


        writeWrapped(
            `Data da auditoria: ${dateBR}`,
            20,
            10,
            5
        );


        writeWrapped(
            `Auditor / Responsável: ${auditForPdf.auditor || "Não informado"}`,
            20,
            10,
            5
        );


        y += 4;


        /* =================================================
           STATUS
        ================================================= */

        pdf.setFont(
            undefined,
            "bold"
        );

        pdf.setFontSize(
            10
        );


        pdf.text(
            isHistoricalAudit
                ? "STATUS: AUDITORIA REALIZADA"
                : "STATUS: AUDITORIA EM PREENCHIMENTO",
            20,
            y
        );


        y += 8;


        /* =================================================
           RESULTADO
        ================================================= */

        pdf.setFontSize(
            14
        );

        pdf.text(
            `RESULTADO: ${auditForPdf.score}%`,
            20,
            y
        );

        y += 6;


        pdf.setFont(
            undefined,
            "normal"
        );

        pdf.setFontSize(
            10
        );


        pdf.text(
            `SIM: ${auditForPdf.yesCount}    NÃO: ${auditForPdf.noCount}    TOTAL: ${auditForPdf.totalCount}`,
            20,
            y
        );


        y += 8;


        pdf.line(
            20,
            y,
            pageWidth - 20,
            y
        );


        y += 8;


        /* =================================================
           PERGUNTAS
        ================================================= */

        for (
            let index = 0;
            index < auditQuestions.length;
            index++
        ) {

            const question =
                auditQuestions[index];


            const answerData =
                answers?.[question.id] ||
                {};


            ensureSpace(
                25
            );


            /*
             * PERGUNTA
             */
            pdf.setFont(
                undefined,
                "bold"
            );

            pdf.setFontSize(
                10
            );


            const questionLines =
                pdf.splitTextToSize(
                    `${index + 1}. ${question.pergunta}`,
                    pageWidth - 40
                );


            questionLines.forEach(
                (line) => {

                    ensureSpace(
                        6
                    );

                    pdf.text(
                        line,
                        20,
                        y
                    );

                    y += 5;
                }
            );


            /*
             * RESPOSTA
             */
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


            answerLines.forEach(
                (line) => {

                    ensureSpace(
                        6
                    );

                    pdf.text(
                        line,
                        25,
                        y
                    );

                    y += 5;
                }
            );


            y += 3;


            /* =================================================
               IMAGEM
            ================================================= */

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


                    ensureSpace(
                        imageHeight + 10
                    );


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


                    ensureSpace(
                        8
                    );


                    pdf.setFontSize(
                        9
                    );


                    pdf.text(
                        "Imagem não pôde ser inserida no PDF.",
                        25,
                        y
                    );


                    y += 6;
                }
            }


            y += 2;
        }


        /* =================================================
           OBSERVAÇÕES
        ================================================= */

        ensureSpace(
            30
        );


        y += 5;


        pdf.setFont(
            undefined,
            "bold"
        );

        pdf.setFontSize(
            12
        );


        pdf.text(
            "OBSERVAÇÕES",
            20,
            y
        );


        y += 7;


        pdf.setFont(
            undefined,
            "normal"
        );

        pdf.setFontSize(
            10
        );


        const observations =
            auditForPdf.observacoes ||
            "Nenhuma observação registrada.";


        writeWrapped(
            observations,
            20,
            10,
            5,
            pageWidth - 40
        );


        /* =================================================
           RODAPÉ
        ================================================= */

        const totalPages =
            pdf.internal.getNumberOfPages();


        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            pdf.setPage(
                page
            );


            pdf.setFont(
                undefined,
                "normal"
            );

            pdf.setFontSize(
                8
            );


            pdf.text(
                `PostoCheck - Auditoria - Página ${page} de ${totalPages}`,
                20,
                pageHeight - 10
            );
        }


        /* =================================================
           NOME DO ARQUIVO
        ================================================= */

        const safeDate =
            (
                dateBR ||
                "data"
            )
            .replaceAll(
                "/",
                "-"
            );


        const safeAuditor =
            (
                auditForPdf.auditor ||
                "auditoria"
            )
            .trim()
            .replace(
                /[\\/:*?"<>|]/g,
                "-"
            )
            .replace(
                /\s+/g,
                "-"
            );


        const fileName =
            `PostoCheck-Auditoria-${safeDate}-${safeAuditor || "auditoria"}.pdf`;


        /* =================================================
           GERAR ARQUIVO NO CELULAR
        ================================================= */

        /*
         * Primeiro usamos Blob.
         * Isso é mais confiável em navegadores móveis
         * do que depender somente do pdf.save().
         */
        const pdfBlob =
            pdf.output(
                "blob"
            );


        if (
            !pdfBlob ||
            pdfBlob.size === 0
        ) {

            throw new Error(
                "O PDF foi criado vazio."
            );
        }


        const blobUrl =
            URL.createObjectURL(
                pdfBlob
            );


        /*
         * Cria um link temporário.
         *
         * Android/Chrome normalmente fará o download.
         */
        const downloadLink =
            document.createElement(
                "a"
            );


        downloadLink.href =
            blobUrl;

        downloadLink.download =
            fileName;

        downloadLink.target =
            "_blank";

        downloadLink.rel =
            "noopener";


        downloadLink.style.display =
            "none";


        document.body.appendChild(
            downloadLink
        );


        /*
         * Tenta o download.
         */
        downloadLink.click();


        /*
         * Remove o elemento.
         */
        setTimeout(
            () => {

                downloadLink.remove();

            },
            100
        );


        /*
         * Também disponibiliza o PDF para
         * navegadores móveis que não respeitam
         * o atributo download.
         */
        setTimeout(
            () => {

                try {

                    /*
                     * Não abrimos automaticamente em todos
                     * os aparelhos porque alguns navegadores
                     * bloqueiam nova aba depois de operações
                     * assíncronas.
                     *
                     * O downloadLink já foi acionado acima.
                     */

                } catch (error) {

                    console.warn(
                        "Fallback do PDF:",
                        error
                    );
                }

            },
            300
        );


        /*
         * Libera a memória depois de alguns segundos.
         */
        setTimeout(
            () => {

                URL.revokeObjectURL(
                    blobUrl
                );

            },
            60000
        );


        showMessage(
            "PDF gerado com sucesso.",
            "success"
        );

    } catch (error) {

        console.error(
            "ERRO AO GERAR PDF:",
            error
        );


        let message =
            "Não foi possível gerar o PDF.";


        if (
            String(
                error?.message || ""
            )
            .toLowerCase()
            .includes(
                "jspdf"
            )
        ) {

            message =
                "Não foi possível carregar a biblioteca do PDF. Verifique a internet do celular e tente novamente.";
        }


        showMessage(
            message,
            "error"
        );

    } finally {

        /*
         * NUNCA deixa o botão preso em
         * "GERANDO PDF".
         */
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

    eventsConfigured =
        true;


    /*
     * CALENDÁRIO
     */
    setupDatePicker();


    /*
     * PDF
     */
    if (generatePdfButton) {

        generatePdfButton.addEventListener(
            "click",
            generatePdf
        );
    }


    /*
     * SALVAR
     */
    if (saveAuditButton) {

        saveAuditButton.addEventListener(
            "click",
            saveAudit
        );
    }


    /*
     * HISTÓRICO
     */
    if (auditHistory) {

        auditHistory.addEventListener(
            "change",
            async () => {

                const auditId =
                    auditHistory.value;


                /*
                 * "Nova auditoria"
                 */
                if (!auditId) {

                    clearAuditForm();

                    return;
                }


                /*
                 * Auditoria já salva.
                 */
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

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        currentUser =
            user;


        setupEvents();


        /*
         * Começa como nova auditoria.
         */
        isHistoricalAudit =
            false;


        updateAuditStatus();


        /*
         * Empresa.
         */
        await loadCompanyProfile();


        /*
         * Perguntas.
         */
        await loadAuditQuestions();


        /*
         * Histórico.
         */
        await loadAuditHistory();


        /*
         * Data.
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


        /*
         * Formulário começa liberado.
         */
        setAuditReadOnly(
            false
        );
    }
);

