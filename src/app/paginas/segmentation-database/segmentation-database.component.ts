import { Component, OnInit, Output, Input, OnDestroy, EventEmitter, ViewChild } from "@angular/core";
import { ImagemService } from "src/app/services/imagens_service/imagens.service";
import { IImagemModelResultado } from "src/app/models/imagem/imagem.model";
import { ObjetoErro } from "src/app/utils/tratamento_erro/ObjetoErro";
import { HttpStatusCode } from "src/app/utils/tratamento_erro/Http_Status_Code";
import { ComunicacaoApi } from "src/app/api_cric_database/comunicacao_api";
import { Subscription } from "rxjs";
import { IObjetoSessaoModel } from "src/app/models/autenticacao/objeto_sessao.model";
import { ArmazenamentoBrowser } from "src/app/utils/browser_storage/browser_storage";
import { ChavesArmazenamentoBrowser } from "src/app/utils/chaves_armazenamento_browser";

@Component({
    selector: "cr-segmentation-database",
    templateUrl: "./segmentation-database.component.html",
    styleUrls: ["./segmentation-database.component.scss"]
})

export class SegmentationDatabaseComponent implements OnInit, OnDestroy {

    @Output() public todasImagens: IImagemModelResultado[];
    @Output() public segmentationDatabase: boolean;
    @ViewChild("atualizarPaginacaoViewChild", null) public atualizacaoDePaginaViewChild: any;
    private armazenamentoBrowser: ArmazenamentoBrowser;
    private comunicacaoApi: ComunicacaoApi;
    private listarImagensSubscription: Subscription;
    private objetoErro: ObjetoErro;
    public carregando: boolean;
    public objetoSessao: IObjetoSessaoModel;

    constructor(private imagemService: ImagemService) {
        this.objetoErro = new ObjetoErro();
        this.comunicacaoApi = new ComunicacaoApi();
        this.armazenamentoBrowser = new ArmazenamentoBrowser();
        this.objetoSessao = JSON.parse(this.armazenamentoBrowser.obterDadoSessao(ChavesArmazenamentoBrowser.CHAVE_USUARIO_LOGADO));
        this.segmentationDatabase = true;
        this.carregando = false;
    }

    ngOnInit() {
        this.listarImagens();
    }

    ngOnDestroy() {
        if(this.listarImagensSubscription) {
            this.listarImagensSubscription.unsubscribe();
        }
    }

    listarImagens() {

        let user_id = 1;
        if(this.objetoSessao) {
            user_id = this.objetoSessao.id_usuario;
        }

        this.todasImagens = null;
        this.carregando = true;
        this.listarImagensSubscription =
        this.imagemService.listarTodasImagens(user_id)
            .subscribe(
                (retorno) => {
                    this.todasImagens = this.construirUrlCaminhoImagemThumbnail(retorno);
                    this.carregando = false;
                },
                (erro) => {

                    this.carregando = false;
                    this.objetoErro = erro.error;
                    switch(this.objetoErro.status_code) {

                    case HttpStatusCode.UNAUTHORIZED: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    case HttpStatusCode.NOT_FOUND: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    case HttpStatusCode.INTERNAL_SERVER_ERROR: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    default: {
                        console.log(erro);
                        break;
                    }
                    }
                }
            );
    }

    construirUrlCaminhoImagemThumbnail(listaImagens: IImagemModelResultado[]) {

        listaImagens.forEach((imagem) => {
            const urlImg = `${this.comunicacaoApi.obterUrlBaseApi()}/${this.comunicacaoApi.obterUrlBaseThumbnail()}/${imagem.nome}`;
            imagem.caminho_imagem = urlImg;
        });

        return listaImagens;
    }

    atualizarListaImagens(carregandoImagem: boolean) {

        if(carregandoImagem) {
            this.carregando = true;
        }
        else {
            this.carregando = false;
            this.listarImagens();
            this.atualizacaoDePaginaViewChild.atualizarPagina();
        }
    }
}
