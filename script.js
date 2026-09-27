const video = document.getElementById("video");

const canvas = document.getElementById("canvas");

const foto = document.getElementById("foto");

const status = document.getElementById("status");

const abrirCamera = document.getElementById("abrirCamera");

const tirarFoto = document.getElementById("tirarFoto");

const fecharCamera = document.getElementById("fecharCamera");

const baixar = document.getElementById("baixar");

let stream = null;


// ABRIR CÂMERA
abrirCamera.addEventListener("click", async () => {

    try {

        status.innerText = "Solicitando acesso à câmera...";

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    ideal: "environment"
                }
            },
            audio: false
        });

        video.srcObject = stream;

        abrirCamera.disabled = true;

        tirarFoto.disabled = false;

        fecharCamera.disabled = false;

        status.innerText = "Câmera aberta.";

    } catch (erro) {

        console.error(erro);

        status.innerText =
            "Não foi possível abrir a câmera. Verifique a permissão.";

        alert(
            "Não foi possível acessar a câmera.\n\n" +
            "Verifique se você permitiu o acesso à câmera."
        );
    }

});


// TIRAR FOTO
tirarFoto.addEventListener("click", () => {

    if (!stream) {
        return;
    }

    const largura = video.videoWidth;

    const altura = video.videoHeight;

    canvas.width = largura;

    canvas.height = altura;

    const contexto = canvas.getContext("2d");

    contexto.drawImage(
        video,
        0,
        0,
        largura,
        altura
    );

    canvas.toBlob((blob) => {

        const url = URL.createObjectURL(blob);

        foto.src = url;

        foto.style.display = "block";

        baixar.href = url;

        baixar.style.display = "block";

        status.innerText = "Foto tirada com sucesso!";

    }, "image/jpeg", 0.90);

});


// FECHAR CÂMERA
fecharCamera.addEventListener("click", () => {

    if (stream) {

        stream.getTracks().forEach((track) => {
            track.stop();
        });

        stream = null;
    }

    video.srcObject = null;

    abrirCamera.disabled = false;

    tirarFoto.disabled = true;

    fecharCamera.disabled = true;

    status.innerText = "Câmera fechada.";

});