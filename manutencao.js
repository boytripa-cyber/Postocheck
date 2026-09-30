/* =========================================================
   POSTOCHECK - CONTROLE GLOBAL DE MANUTENÇÃO
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
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import firebaseConfig from "./firebase-config.js";


/* =========================================================
   INICIALIZAÇÃO DO FIREBASE
   ========================================================= */

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);


const db =
    getFirestore(app);


/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

const PAGINA_MANUTENCAO =
    "manutencao.html";

const PAGINA_INICIAL =
    "index.html";

const INTERVALO_VERIFICACAO =
    10000;


/* =========================================================
   CAMINHO DO FIRESTORE
   =========================================================

   configuracoes
       └── sistema
           ├── manutencaoAtiva
           └── mensagem

   ========================================================= */

const REFERENCIA_MANUTENCAO =
    doc(
        db,
        "configuracoes",
        "sistema"
    );


/* =========================================================
   ELEMENTOS DA PÁGINA DE MANUTENÇÃO
   ========================================================= */

const mensagemElemento =
    document.getElementById(
        "mensagemManutencao"
    );


const statusElemento =
    document.getElementById(
        "statusManutencao"
    );


/* =========================================================
   IDENTIFICAR PÁGINA ATUAL
   ========================================================= */

function obterPaginaAtual() {

    const caminho =
        window.location.pathname;


    const partes =
        caminho.split("/");


    const pagina =
        partes[
            partes.length - 1
        ];


    return (
        pagina ||
        PAGINA_INICIAL
    ).toLowerCase();

}


/* =========================================================
   VERIFICAR SE ESTÁ NA MANUTENÇÃO
   ========================================================= */

function estaNaPaginaDeManutencao() {

    return (
        obterPaginaAtual() ===
        PAGINA_MANUTENCAO
    );

}


/* =========================================================
   ATUALIZAR MENSAGEM
   ========================================================= */

function atualizarMensagem(
    mensagem
) {

    if (
        !mensagemElemento
    ) {
        return;
    }


    mensagemElemento.textContent =
        mensagem ||
        "O sistema está temporariamente indisponível.";

}


/* =========================================================
   ATUALIZAR STATUS
   ========================================================= */

function atualizarStatus(
    texto
) {

    if (
        !statusElemento
    ) {
        return;
    }


    statusElemento.textContent =
        texto;

}


/* =========================================================
   ABRIR PÁGINA DE MANUTENÇÃO
   ========================================================= */

function abrirPaginaDeManutencao() {

    if (
        estaNaPaginaDeManutencao()
    ) {
        return;
    }


    console.warn(
        "POSTOCHECK: manutenção ativa."
    );


    console.warn(
        "POSTOCHECK: redirecionando para:",
        PAGINA_MANUTENCAO
    );


    window.location.replace(
        PAGINA_MANUTENCAO
    );

}


/* =========================================================
   VOLTAR PARA O INÍCIO
   ========================================================= */

function voltarParaInicio() {

    if (
        !estaNaPaginaDeManutencao()
    ) {
        return;
    }


    console.log(
        "POSTOCHECK: manutenção desativada."
    );


    console.log(
        "POSTOCHECK: retornando para:",
        PAGINA_INICIAL
    );


    window.location.replace(
        PAGINA_INICIAL
    );

}


/* =========================================================
   VERIFICAR MANUTENÇÃO NO FIRESTORE
   ========================================================= */

async function verificarManutencao() {

    try {

        console.log(
            "----------------------------------------"
        );


        console.log(
            "POSTOCHECK: verificando manutenção..."
        );


        console.log(
            "POSTOCHECK: documento:",
            "configuracoes/sistema"
        );


        /* =====================================================
           BUSCAR DOCUMENTO
           ===================================================== */

        const snapshot =
            await getDoc(
                REFERENCIA_MANUTENCAO
            );


        /* =====================================================
           DOCUMENTO NÃO EXISTE
           ===================================================== */

        if (
            !snapshot.exists()
        ) {

            console.warn(
                "POSTOCHECK: documento não encontrado:"
            );


            console.warn(
                "configuracoes/sistema"
            );


            if (
                estaNaPaginaDeManutencao()
            ) {

                atualizarMensagem(
                    "O sistema está temporariamente indisponível."
                );


                atualizarStatus(
                    "Configuração não encontrada"
                );

            }


            return;

        }


        /* =====================================================
           PEGAR DADOS
           ===================================================== */

        const dados =
            snapshot.data();


        /* =====================================================
           MANUTENÇÃO ATIVA
           ===================================================== */

        const manutencaoAtiva =
            dados.manutencaoAtiva === true;


        /* =====================================================
           MENSAGEM
           ===================================================== */

        const mensagem =
            typeof dados.mensagem === "string" &&
            dados.mensagem.trim() !== ""
                ? dados.mensagem.trim()
                : "O sistema está temporariamente indisponível.";


        /* =====================================================
           LOGS
           ===================================================== */

        console.log(
            "POSTOCHECK: documento encontrado."
        );


        console.log(
            "POSTOCHECK: manutencaoAtiva:",
            manutencaoAtiva
        );


        console.log(
            "POSTOCHECK: mensagem:",
            mensagem
        );


        /* =====================================================
           MANUTENÇÃO ATIVA
           ===================================================== */

        if (
            manutencaoAtiva === true
        ) {

            console.warn(
                "POSTOCHECK: SISTEMA EM MANUTENÇÃO."
            );


            /* -------------------------------------------------
               SE JÁ ESTÁ NA PÁGINA DE MANUTENÇÃO
               ------------------------------------------------- */

            if (
                estaNaPaginaDeManutencao()
            ) {

                atualizarMensagem(
                    mensagem
                );


                atualizarStatus(
                    "Manutenção em andamento"
                );


                console.log(
                    "POSTOCHECK: mensagem de manutenção atualizada."
                );


                return;

            }


            /* -------------------------------------------------
               SE ESTÁ EM QUALQUER OUTRA PÁGINA
               ------------------------------------------------- */

            abrirPaginaDeManutencao();


            return;

        }


        /* =====================================================
           MANUTENÇÃO DESATIVADA
           ===================================================== */

        console.log(
            "POSTOCHECK: sistema disponível."
        );


        /* -----------------------------------------------------
           SE ESTÁ NA PÁGINA DE MANUTENÇÃO
           ----------------------------------------------------- */

        if (
            estaNaPaginaDeManutencao()
        ) {

            atualizarStatus(
                "Sistema disponível"
            );


            voltarParaInicio();


            return;

        }


        /* -----------------------------------------------------
           SISTEMA NORMAL
           ----------------------------------------------------- */

        console.log(
            "POSTOCHECK: nenhuma ação necessária."
        );

    } catch (error) {

        console.error(
            "========================================"
        );


        console.error(
            "POSTOCHECK: ERRO AO VERIFICAR MANUTENÇÃO"
        );


        console.error(
            error
        );


        console.error(
            "========================================"
        );


        /* =====================================================
           ERRO NA PÁGINA DE MANUTENÇÃO
           ===================================================== */

        if (
            estaNaPaginaDeManutencao()
        ) {

            atualizarMensagem(
                "O sistema está temporariamente indisponível."
            );


            atualizarStatus(
                "Verificando disponibilidade..."
            );

        }

    }

}


/* =========================================================
   PRIMEIRA VERIFICAÇÃO
   ========================================================= */

verificarManutencao();


/* =========================================================
   VERIFICAÇÃO AUTOMÁTICA
   ========================================================= */

setInterval(
    verificarManutencao,
    INTERVALO_VERIFICACAO
);