/* =========================================================
   POSTOCHECK - RESULTADOS
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
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


import firebaseConfig from "./firebase-config.js";


/* =========================================================
   INICIALIZAÇÃO
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
   CONFIGURAÇÃO GERAL
   ========================================================= */

Chart.defaults.font.family =
    "Arial, Helvetica, sans-serif";

Chart.defaults.font.weight =
    "700";

Chart.defaults.color =
    "#000000";


/* =========================================================
   PLUGIN - PORCENTAGEM NO CENTRO
   ========================================================= */

const centroGraficoGeral = {

    id: "centroGraficoGeral",

    afterDraw(chart) {

        if (
            chart.config.type !== "doughnut"
        ) {
            return;
        }


        const {
            ctx,
            chartArea
        } = chart;


        if (!chartArea) {
            return;
        }


        const dataset =
            chart.data.datasets[0];


        if (!dataset) {
            return;
        }


        const valores =
            dataset.data || [];


        const conformes =
            Number(
                valores[0] || 0
            );


        const naoConformes =
            Number(
                valores[1] || 0
            );


        const total =
            conformes +
            naoConformes;


        const percentual =
            total > 0
                ? Math.round(
                    (
                        conformes /
                        total
                    ) * 100
                )
                : 0;


        const centroX =
            (
                chartArea.left +
                chartArea.right
            ) / 2;


        const centroY =
            (
                chartArea.top +
                chartArea.bottom
            ) / 2;


        ctx.save();


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "middle";


        ctx.fillStyle =
            "#000000";


        ctx.font =
            "900 30px Arial, Helvetica, sans-serif";


        ctx.fillText(
            percentual + "%",
            centroX,
            centroY
        );


        ctx.restore();

    }

};


/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function formatarData(data) {

    if (!data) {
        return "";
    }


    const texto =
        String(data);


    const partes =
        texto.split("-");


    if (
        partes.length === 3
    ) {

        return (
            partes[2] +
            "/" +
            partes[1] +
            "/" +
            partes[0]
        );

    }


    return texto;

}


/* =========================================================
   NORMALIZAR TEXTO
   ========================================================= */

function normalizarTexto(valor) {

    return String(
        valor || ""
    )
        .trim()
        .toUpperCase();

}


/* =========================================================
   OBTER TEXTO DA PERGUNTA
   ========================================================= */

function obterTextoPergunta(
    pergunta,
    idPergunta
) {

    if (!pergunta) {

        return (
            "Item da auditoria " +
            idPergunta
        );

    }


    const texto =
        pergunta.pergunta ||
        pergunta.texto ||
        pergunta.titulo ||
        pergunta.descricao;


    if (
        texto &&
        String(texto).trim()
    ) {

        return String(texto).trim();

    }


    return (
        "Item da auditoria " +
        idPergunta
    );

}


/* =========================================================
   CRIAR ÁREA DE DETALHES
   ========================================================= */

function criarAreaDetalhes() {

    let container =
        document.getElementById(
            "detalhesNaoConformidades"
        );


    if (container) {

        return container;

    }


    const canvas =
        document.getElementById(
            "graficoNaoConformidades"
        );


    if (!canvas) {

        return null;

    }


    const card =
        canvas.closest(
            ".chart-card"
        );


    if (!card) {

        return null;

    }


    container =
        document.createElement(
            "div"
        );


    container.id =
        "detalhesNaoConformidades";


    container.style.marginTop =
        "20px";


    container.style.paddingTop =
        "18px";


    container.style.borderTop =
        "2px solid #000000";


    container.style.display =
        "none";


    card.appendChild(
        container
    );


    return container;

}


/* =========================================================
   EXIBIR DETALHES DAS NÃO CONFORMIDADES
   ========================================================= */

function mostrarDetalhesNaoConformidades(
    categoria,
    itens
) {

    const container =
        criarAreaDetalhes();


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    container.style.display =
        "block";


    const titulo =
        document.createElement(
            "div"
        );


    titulo.style.fontSize =
        "18px";


    titulo.style.fontWeight =
        "900";


    titulo.style.marginBottom =
        "6px";


    titulo.textContent =
        "PONTOS DE ATENÇÃO";


    container.appendChild(
        titulo
    );


    const subtitulo =
        document.createElement(
            "div"
        );


    subtitulo.style.fontSize =
        "14px";


    subtitulo.style.fontWeight =
        "700";


    subtitulo.style.marginBottom =
        "16px";


    subtitulo.textContent =
        categoria +
        " — " +
        itens.length +
        (
            itens.length === 1
                ? " não conformidade"
                : " não conformidades"
        );


    container.appendChild(
        subtitulo
    );


    if (
        itens.length === 0
    ) {

        const mensagem =
            document.createElement(
                "div"
            );


        mensagem.style.padding =
            "14px";


        mensagem.style.border =
            "2px solid #000000";


        mensagem.style.background =
            "#f5c400";


        mensagem.style.fontWeight =
            "900";


        mensagem.textContent =
            "Nenhuma não conformidade encontrada nesta área.";


        container.appendChild(
            mensagem
        );


        return;

    }


    const lista =
        document.createElement(
            "div"
        );


    lista.style.display =
        "flex";


    lista.style.flexDirection =
        "column";


    lista.style.gap =
        "10px";


    itens.forEach(
        (
            item,
            index
        ) => {

            const itemContainer =
                document.createElement(
                    "div"
                );


            itemContainer.style.display =
                "flex";


            itemContainer.style.alignItems =
                "flex-start";


            itemContainer.style.gap =
                "12px";


            itemContainer.style.padding =
                "12px";


            itemContainer.style.border =
                "2px solid #000000";


            itemContainer.style.background =
                "#ffffff";


            const numero =
                document.createElement(
                    "div"
                );


            numero.style.minWidth =
                "30px";


            numero.style.width =
                "30px";


            numero.style.height =
                "30px";


            numero.style.display =
                "flex";


            numero.style.alignItems =
                "center";


            numero.style.justifyContent =
                "center";


            numero.style.background =
                "#000000";


            numero.style.color =
                "#ffffff";


            numero.style.fontWeight =
                "900";


            numero.textContent =
                index + 1;


            const conteudo =
                document.createElement(
                    "div"
                );


            conteudo.style.flex =
                "1";


            const pergunta =
                document.createElement(
                    "div"
                );


            pergunta.style.fontWeight =
                "900";


            pergunta.style.lineHeight =
                "1.4";


            pergunta.textContent =
                item.pergunta;


            conteudo.appendChild(
                pergunta
            );


            if (
                item.data
            ) {

                const data =
                    document.createElement(
                        "div"
                    );


                data.style.marginTop =
                    "5px";


                data.style.fontSize =
                    "12px";


                data.style.fontWeight =
                    "700";


                data.style.opacity =
                    "0.7";


                data.textContent =
                    "Auditoria: " +
                    formatarData(
                        item.data
                    );


                conteudo.appendChild(
                    data
                );

            }


            itemContainer.appendChild(
                numero
            );


            itemContainer.appendChild(
                conteudo
            );


            lista.appendChild(
                itemContainer
            );

        }
    );


    container.appendChild(
        lista
    );

}


/* =========================================================
   INÍCIO
   ========================================================= */

function iniciarResultados() {

    console.log(
        "POSTOCHECK: resultados.js iniciado."
    );


    if (
        typeof Chart === "undefined"
    ) {

        console.error(
            "POSTOCHECK: Chart.js não foi carregado."
        );

        return;
    }


    onAuthStateChanged(
        auth,
        async (user) => {

            console.log(
                "POSTOCHECK: verificando autenticação..."
            );


            if (!user) {

                console.warn(
                    "POSTOCHECK: nenhum usuário autenticado."
                );

                return;
            }


            console.log(
                "POSTOCHECK: usuário autenticado:",
                user.uid
            );


            try {

                /* =================================================
                   BUSCAR AUDITORIAS
                ================================================== */

                const auditoriasReference =
                    collection(
                        db,
                        "usuarios",
                        user.uid,
                        "auditorias"
                    );


                console.log(
                    "POSTOCHECK: buscando auditorias em:",
                    `usuarios/${user.uid}/auditorias`
                );


                const snapshot =
                    await getDocs(
                        auditoriasReference
                    );


                console.log(
                    "POSTOCHECK: auditorias encontradas:",
                    snapshot.size
                );


                const auditorias = [];


                snapshot.forEach(
                    (documento) => {

                        const dados =
                            documento.data();


                        console.log(
                            "POSTOCHECK: auditoria encontrada:",
                            documento.id,
                            dados
                        );


                        auditorias.push({

                            id:
                                documento.id,

                            ...dados

                        });

                    }
                );


                /* =================================================
                   BUSCAR PERGUNTAS
                ================================================== */

                const perguntasReference =
                    collection(
                        db,
                        "usuarios",
                        user.uid,
                        "perguntasAuditoria"
                    );


                const perguntasSnapshot =
                    await getDocs(
                        perguntasReference
                    );


                const perguntas =
                    {};


                perguntasSnapshot.forEach(
                    (documento) => {

                        perguntas[documento.id] =
                            {
                                id:
                                    documento.id,

                                ...documento.data()

                            };

                    }
                );


                console.log(
                    "POSTOCHECK: perguntas encontradas:",
                    perguntasSnapshot.size
                );


                /* =================================================
                   ORDENAR AUDITORIAS POR DATA
                ================================================== */

                auditorias.sort(
                    (a, b) => {

                        const dataA =
                            new Date(
                                String(
                                    a.data || ""
                                ) +
                                "T00:00:00"
                            ).getTime();


                        const dataB =
                            new Date(
                                String(
                                    b.data || ""
                                ) +
                                "T00:00:00"
                            ).getTime();


                        return dataA - dataB;

                    }
                );


                /* =================================================
                   INDICADORES
                ================================================== */

                let totalConformes = 0;

                let totalNaoConformes = 0;

                let totalQuestoes = 0;


                auditorias.forEach(
                    (auditoria) => {

                        const conformes =
                            Number(
                                auditoria.yesCount || 0
                            );


                        const naoConformes =
                            Number(
                                auditoria.noCount || 0
                            );


                        const total =
                            Number(
                                auditoria.totalCount || 0
                            );


                        totalConformes +=
                            conformes;


                        totalNaoConformes +=
                            naoConformes;


                        totalQuestoes +=
                            total;

                    }
                );


                const indiceGeral =
                    totalQuestoes > 0
                        ? Math.round(
                            (
                                totalConformes /
                                totalQuestoes
                            ) * 100
                        )
                        : 0;


                const elementoTotalAuditorias =
                    document.getElementById(
                        "totalAuditorias"
                    );


                const elementoTotalConformes =
                    document.getElementById(
                        "totalConformes"
                    );


                const elementoTotalNaoConformes =
                    document.getElementById(
                        "totalNaoConformes"
                    );


                const elementoIndiceGeral =
                    document.getElementById(
                        "indiceGeral"
                    );


                if (
                    elementoTotalAuditorias
                ) {

                    elementoTotalAuditorias.textContent =
                        auditorias.length;

                }


                if (
                    elementoTotalConformes
                ) {

                    elementoTotalConformes.textContent =
                        totalConformes;

                }


                if (
                    elementoTotalNaoConformes
                ) {

                    elementoTotalNaoConformes.textContent =
                        totalNaoConformes;

                }


                if (
                    elementoIndiceGeral
                ) {

                    elementoIndiceGeral.textContent =
                        indiceGeral + "%";

                }


                /* =================================================
                   DADOS POR ÁREA
                ================================================== */

                const areas = {

                    AMBIENTAL: {

                        sim: 0,

                        nao: 0,

                        itensNaoConformes: []

                    },

                    BOMBAS: {

                        sim: 0,

                        nao: 0,

                        itensNaoConformes: []

                    },

                    DOCUMENTAL: {

                        sim: 0,

                        nao: 0,

                        itensNaoConformes: []

                    }

                };


                /* =================================================
                   PROCESSAR RESPOSTAS
                ================================================== */

                auditorias.forEach(
                    (auditoria) => {

                        const respostas =
                            auditoria.respostas || {};


                        Object.entries(
                            respostas
                        ).forEach(
                            (
                                [
                                    idPergunta,
                                    respostaData
                                ]
                            ) => {

                                if (
                                    !respostaData
                                ) {

                                    return;

                                }


                                const categoria =
                                    normalizarTexto(
                                        respostaData.categoria
                                    );


                                if (
                                    !areas[categoria]
                                ) {

                                    return;

                                }


                                const resposta =
                                    normalizarTexto(
                                        respostaData.resposta
                                    );


                                if (
                                    resposta === "SIM"
                                ) {

                                    areas[categoria].sim++;

                                }


                                if (
                                    resposta === "NAO"
                                ) {

                                    areas[categoria].nao++;


                                    const pergunta =
                                        perguntas[
                                            idPergunta
                                        ];


                                    const textoPergunta =
                                        obterTextoPergunta(
                                            pergunta,
                                            idPergunta
                                        );


                                    areas[
                                        categoria
                                    ]
                                        .itensNaoConformes
                                        .push({

                                            pergunta:
                                                textoPergunta,

                                            idPergunta:
                                                idPergunta,

                                            data:
                                                auditoria.data,

                                            auditoriaId:
                                                auditoria.id

                                        });

                                }

                            }
                        );

                    }
                );


                /* =================================================
                   PERCENTUAIS POR ÁREA
                ================================================== */

                function calcularPercentualArea(
                    area
                ) {

                    const total =
                        area.sim +
                        area.nao;


                    if (
                        total === 0
                    ) {

                        return 0;

                    }


                    return Math.round(
                        (
                            area.sim /
                            total
                        ) * 100
                    );

                }


                const percentualAmbiental =
                    calcularPercentualArea(
                        areas.AMBIENTAL
                    );


                const percentualBombas =
                    calcularPercentualArea(
                        areas.BOMBAS
                    );


                const percentualDocumental =
                    calcularPercentualArea(
                        areas.DOCUMENTAL
                    );


                /* =================================================
                   NÃO CONFORMIDADES POR ÁREA
                ================================================== */

                const naoConformidadesAmbiental =
                    areas.AMBIENTAL.nao;


                const naoConformidadesBombas =
                    areas.BOMBAS.nao;


                const naoConformidadesDocumental =
                    areas.DOCUMENTAL.nao;


                /* =================================================
                   EVOLUÇÃO DAS AUDITORIAS
                ================================================== */

                const evolucaoLabels = [];

                const evolucaoValores = [];


                auditorias.forEach(
                    (auditoria) => {

                        let score =
                            Number(
                                auditoria.score
                            );


                        if (
                            !Number.isFinite(
                                score
                            )
                        ) {

                            const yes =
                                Number(
                                    auditoria.yesCount || 0
                                );


                            const total =
                                Number(
                                    auditoria.totalCount || 0
                                );


                            score =
                                total > 0
                                    ? Math.round(
                                        (
                                            yes /
                                            total
                                        ) * 100
                                    )
                                    : 0;

                        }


                        evolucaoLabels.push(
                            formatarData(
                                auditoria.data
                            )
                        );


                        evolucaoValores.push(
                            score
                        );

                    }
                );


                /* =========================================================
                   GRÁFICO GERAL
                   ========================================================= */

                const graficoGeral =
                    document.getElementById(
                        "graficoGeral"
                    );


                if (
                    graficoGeral
                ) {

                    new Chart(
                        graficoGeral,
                        {

                            type: "doughnut",

                            data: {

                                labels: [
                                    "Conformes",
                                    "Não conformes"
                                ],

                                datasets: [{

                                    data: [
                                        totalConformes,
                                        totalNaoConformes
                                    ],

                                    backgroundColor: [
                                        "#f5c400",
                                        "#000000"
                                    ],

                                    borderColor:
                                        "#ffffff",

                                    borderWidth:
                                        3

                                }]

                            },

                            options: {

                                responsive:
                                    true,

                                maintainAspectRatio:
                                    false,

                                cutout:
                                    "65%",

                                plugins: {

                                    legend: {

                                        position:
                                            "bottom",

                                        labels: {

                                            padding:
                                                20,

                                            font: {

                                                weight:
                                                    "900"

                                            }

                                        }

                                    }

                                }

                            },

                            plugins: [
                                centroGraficoGeral
                            ]

                        }
                    );

                }


                /* =========================================================
                   GRÁFICO POR ÁREA
                   ========================================================= */

                const graficoAreas =
                    document.getElementById(
                        "graficoAreas"
                    );


                if (
                    graficoAreas
                ) {

                    new Chart(
                        graficoAreas,
                        {

                            type: "bar",

                            data: {

                                labels: [
                                    "Ambiental",
                                    "Bombas",
                                    "Documental"
                                ],

                                datasets: [{

                                    label:
                                        "Conformidade (%)",

                                    data: [
                                        percentualAmbiental,
                                        percentualBombas,
                                        percentualDocumental
                                    ],

                                    backgroundColor:
                                        "#f5c400",

                                    borderColor:
                                        "#000000",

                                    borderWidth:
                                        2

                                }]

                            },

                            options: {

                                responsive:
                                    true,

                                maintainAspectRatio:
                                    false,

                                scales: {

                                    y: {

                                        beginAtZero:
                                            true,

                                        max:
                                            100,

                                        ticks: {

                                            callback:
                                                function(value) {

                                                    return (
                                                        value +
                                                        "%"
                                                    );

                                                }

                                        }

                                    }

                                },

                                plugins: {

                                    legend: {

                                        display:
                                            false

                                    }

                                }

                            }

                        }
                    );

                }


                /* =========================================================
                   EVOLUÇÃO DAS AUDITORIAS
                   ========================================================= */

                const graficoEvolucao =
                    document.getElementById(
                        "graficoEvolucao"
                    );


                if (
                    graficoEvolucao
                ) {

                    new Chart(
                        graficoEvolucao,
                        {

                            type: "line",

                            data: {

                                labels:
                                    evolucaoLabels,

                                datasets: [{

                                    label:
                                        "Índice de conformidade",

                                    data:
                                        evolucaoValores,

                                    borderColor:
                                        "#000000",

                                    backgroundColor:
                                        "rgba(245, 196, 0, 0.25)",

                                    borderWidth:
                                        4,

                                    pointBackgroundColor:
                                        "#f5c400",

                                    pointBorderColor:
                                        "#000000",

                                    pointBorderWidth:
                                        2,

                                    pointRadius:
                                        5,

                                    tension:
                                        0.3,

                                    fill:
                                        true

                                }]

                            },

                            options: {

                                responsive:
                                    true,

                                maintainAspectRatio:
                                    false,

                                scales: {

                                    y: {

                                        beginAtZero:
                                            false,

                                        min:
                                            50,

                                        max:
                                            100,

                                        ticks: {

                                            callback:
                                                function(value) {

                                                    return (
                                                        value +
                                                        "%"
                                                    );

                                                }

                                        }

                                    }

                                }

                            }

                        }
                    );

                }


                /* =========================================================
                   NÃO CONFORMIDADES
                   ========================================================= */

                const graficoNaoConformidades =
                    document.getElementById(
                        "graficoNaoConformidades"
                    );


                if (
                    graficoNaoConformidades
                ) {

                    const categorias =
                        [
                            "AMBIENTAL",
                            "BOMBAS",
                            "DOCUMENTAL"
                        ];


                    const nomesCategorias =
                        [
                            "Ambiental",
                            "Bombas",
                            "Documental"
                        ];


                    const valoresNaoConformidades =
                        [
                            naoConformidadesAmbiental,
                            naoConformidadesBombas,
                            naoConformidadesDocumental
                        ];


                    const grafico =
                        new Chart(
                            graficoNaoConformidades,
                            {

                                type: "bar",

                                data: {

                                    labels:
                                        nomesCategorias,

                                    datasets: [{

                                        label:
                                            "Não conformidades",

                                        data:
                                            valoresNaoConformidades,

                                        backgroundColor:
                                            "#000000",

                                        borderColor:
                                            "#f5c400",

                                        borderWidth:
                                            3

                                    }]

                                },

                                options: {

                                    responsive:
                                        true,

                                    maintainAspectRatio:
                                        false,

                                    indexAxis:
                                        "y",

                                    interaction: {

                                        mode:
                                            "nearest",

                                        intersect:
                                            true

                                    },

                                    onClick:
                                        function(
                                            evento,
                                            elementos
                                        ) {

                                            if (
                                                !elementos ||
                                                elementos.length === 0
                                            ) {

                                                return;

                                            }


                                            const indice =
                                                elementos[0]
                                                    .index;


                                            const categoria =
                                                categorias[
                                                    indice
                                                ];


                                            if (
                                                !categoria ||
                                                !areas[categoria]
                                            ) {

                                                return;

                                            }


                                            mostrarDetalhesNaoConformidades(
                                                categoria,
                                                areas[
                                                    categoria
                                                ]
                                                    .itensNaoConformes
                                            );


                                            const container =
                                                document.getElementById(
                                                    "detalhesNaoConformidades"
                                                );


                                            if (
                                                container
                                            ) {

                                                setTimeout(
                                                    () => {

                                                        container.scrollIntoView(
                                                            {
                                                                behavior:
                                                                    "smooth",

                                                                block:
                                                                    "nearest"

                                                            }
                                                        );

                                                    },
                                                    50
                                                );

                                            }

                                        },

                                    plugins: {

                                        legend: {

                                            display:
                                                false

                                        },

                                        tooltip: {

                                            callbacks: {

                                                label:
                                                    function(
                                                        contexto
                                                    ) {

                                                        const categoria =
                                                            categorias[
                                                                contexto.dataIndex
                                                            ];


                                                        const quantidade =
                                                            Number(
                                                                contexto.raw || 0
                                                            );


                                                        return (
                                                            " " +
                                                            quantidade +
                                                            (
                                                                quantidade === 1
                                                                    ? " não conformidade"
                                                                    : " não conformidades"
                                                            ) +
                                                            " — toque para ver os itens"
                                                        );

                                                    }

                                            }

                                        }

                                    },

                                    scales: {

                                        x: {

                                            beginAtZero:
                                                true,

                                            ticks: {

                                                stepSize:
                                                    1

                                            }

                                        }

                                    }

                                }

                            }
                        );


                    /* =================================================
                       INDICAÇÃO DE INTERAÇÃO
                    ================================================== */

                    const canvasWrapper =
                        graficoNaoConformidades.parentElement;


                    if (
                        canvasWrapper
                    ) {

                        canvasWrapper.style.cursor =
                            "pointer";

                    }

                }


                console.log(
                    "POSTOCHECK: gráficos carregados com sucesso."
                );


                console.log(
                    "POSTOCHECK: resumo:",
                    {

                        auditorias:
                            auditorias.length,

                        conformes:
                            totalConformes,

                        naoConformes:
                            totalNaoConformes,

                        total:
                            totalQuestoes,

                        indice:
                            indiceGeral,

                        ambiental:
                            percentualAmbiental,

                        bombas:
                            percentualBombas,

                        documental:
                            percentualDocumental

                    }
                );


                console.log(
                    "POSTOCHECK: itens não conformes:",
                    {

                        ambiental:
                            areas.AMBIENTAL
                                .itensNaoConformes,

                        bombas:
                            areas.BOMBAS
                                .itensNaoConformes,

                        documental:
                            areas.DOCUMENTAL
                                .itensNaoConformes

                    }
                );


            } catch (error) {

                console.error(
                    "POSTOCHECK: erro ao carregar resultados:",
                    error
                );

            }

        }
    );

}


/* =========================================================
   DOM
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarResultados
    );

} else {

    iniciarResultados();

}