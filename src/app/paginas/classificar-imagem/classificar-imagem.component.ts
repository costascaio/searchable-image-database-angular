import { Subscription } from "rxjs";
import { Component, OnInit, Input, OnDestroy, AfterContentInit, AfterViewInit, AfterViewChecked } from "@angular/core";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { ImagemService } from "src/app/services/imagens_service/imagens.service";
import { IImagemModelResultado } from "src/app/models/imagem/imagem.model";
import { IUsuarioBaseModel } from "src/app/models/usuario/usuario_base.model";
import { HttpStatusCode } from "../../utils/tratamento_erro/Http_Status_Code";
import { ChavesArmazenamentoBrowser } from "../../utils/chaves_armazenamento_browser";
import { IObjetoSessaoModel } from "../../models/autenticacao/objeto_sessao.model";
import { ILesaoModelResultado } from "src/app/models/imagem/lesao.model";
import { ArmazenamentoBrowser } from "src/app/utils/browser_storage/browser_storage";
import { IClassificacaoCelulaModelResultado } from "src/app/models/classificacao/classificacao_celula.model";
import { ObjetoErro } from "src/app/utils/tratamento_erro/ObjetoErro";
import { ComunicacaoApi } from "../../api_cric_database/comunicacao_api";
import { CadastrarClassificacaoRequisicao } from "./requisicao";
import { LesaoEntidade } from "./lesao.entidade";
import { Mensagens } from "src/app/utils/mensagens";
import { ImagemEntidade } from "./imagem.entidade";
import {DatePipe} from "@angular/common";

declare const draw: any;
declare const exibirClassificacoes: any;
declare const obterLarguraAlturaAtualCanvas: any;

@Component({
    selector: "cr-classificar-imagem",
    templateUrl: "./classificar-imagem.component.html",
    styleUrls: ["./classificar-imagem.component.scss"],
    providers: [DatePipe]
})

export class ClassificarImagemComponent implements OnInit, OnDestroy {

    private armazenamentoBrowser: ArmazenamentoBrowser;
    private atualizarDadosImagemSubscription: Subscription;
    private cadastrarClassificacaoSubscription: Subscription;
    private comunicacaoApi: ComunicacaoApi;
    private excluirRegistroDeClassificacaoSubscription: Subscription;
    private listarClassificacoesDeCelulaSubscription: Subscription;
    private listarDescricoesSubscription: Subscription;
    private listarTodasLesoesSubscription: Subscription;
    private objetoErro: ObjetoErro;
    private obterUmaImagemSubscription: Subscription;
    private requisicao: CadastrarClassificacaoRequisicao;
    public atualizarInformacoes: boolean;
    public caminho_imagem: string;
    public carregando: boolean;
    public coord_x: number;
    public coord_y: number;
    public exibirModal: boolean;
    public id_imagem: number;
    public id_lesao: number;
    public imagem: IImagemModelResultado;
    public imagemAtualizacao: ImagemEntidade;
    public indiceSelecionado: number;
    public indiceSelecionadoPadrao: number;
    public lesao: LesaoEntidade;
    public objetoSessao: IObjetoSessaoModel;
    public permitirCadastroClassificacao: boolean;
    public todasClassificacoes: IClassificacaoCelulaModelResultado;
    public todasLesoes: ILesaoModelResultado[];
    public todosUsuarios: IUsuarioBaseModel[];

    //#region Construtor
    constructor(private imagemService: ImagemService, private activatedRoute: ActivatedRoute, public datepipe: DatePipe) {
        this.comunicacaoApi = new ComunicacaoApi();
        this.requisicao = new CadastrarClassificacaoRequisicao();
        this.lesao = new LesaoEntidade();
        this.objetoErro = new ObjetoErro();
        this.indiceSelecionadoPadrao = -1;
        this.atualizarInformacoes = false;
        this.carregando = false;
        this.imagemAtualizacao = new ImagemEntidade();
        this.imagemAtualizacao.lesao = new LesaoEntidade();
    }
    //#endregion

    //#region Inicializacao
    ngOnInit() {
        this.indiceSelecionado = this.indiceSelecionadoPadrao;
        this.exibirModal = false;
        this.permitirCadastroClassificacao = false;
        this.armazenamentoBrowser = new ArmazenamentoBrowser();
        this.objetoSessao = JSON.parse(this.armazenamentoBrowser.obterDadoSessao(ChavesArmazenamentoBrowser.CHAVE_USUARIO_LOGADO));

        this.activatedRoute.paramMap
            .subscribe((params: ParamMap) => {
                this.id_imagem = Number(params.get("id"));
                this.obterUmaImagem(this.id_imagem);
            });

        this.listarTodasLesoes();
    }

    ngOnDestroy() {
        if (this.obterUmaImagemSubscription) {
            this.obterUmaImagemSubscription.unsubscribe();
        }
        if (this.cadastrarClassificacaoSubscription) {
            this.cadastrarClassificacaoSubscription.unsubscribe();
        }
        if (this.listarTodasLesoesSubscription) {
            this.listarTodasLesoesSubscription.unsubscribe();
        }
        if (this.listarClassificacoesDeCelulaSubscription) {
            this.listarClassificacoesDeCelulaSubscription.unsubscribe();
        }
        if(this.excluirRegistroDeClassificacaoSubscription) {
            this.excluirRegistroDeClassificacaoSubscription.unsubscribe();
        }
        if(this.listarDescricoesSubscription) {
            this.listarDescricoesSubscription.unsubscribe();
        }
        if(this.atualizarDadosImagemSubscription) {
            this.atualizarDadosImagemSubscription.unsubscribe();
        }
    }
    //#endregion

    //#region Metodos
    registrarPonto($event) {
        this.carregando = true;
        const div = document.getElementById("canvas");
        const rect = div.getBoundingClientRect();
        this.coord_x = Math.round($event.clientX - rect.left);
        this.coord_y = Math.round($event.clientY - rect.top);

        const dimensoesCanvas = obterLarguraAlturaAtualCanvas();
        this.requisicao.coord_centro_nucleo_x = this.coord_x;
        this.requisicao.coord_centro_nucleo_y = this.coord_y;
        this.requisicao.alturaCanvas = dimensoesCanvas.altura;
        this.requisicao.larguraCanvas = dimensoesCanvas.largura;

        draw($event, this.coord_x, this.coord_y);
        this.exibirModal = true;
        this.carregando = false;
    }

    obterUmaImagem(id_imagem: number) {

        this.carregando = true;
        this.obterUmaImagemSubscription =
        this.imagemService.obterImagem(id_imagem)
            .subscribe(
                (retorno) => {
                    this.imagem = retorno;
                    const destino = this.imagem.fonte_aquisicao == 1 ? this.comunicacaoApi.obterUrlBaseInterna() : this.comunicacaoApi.obterUrlBaseExterna();
                    this.caminho_imagem = `${this.comunicacaoApi.obterUrlBaseApi()}/${destino}/${this.imagem.nome}`;

                    setTimeout(() => {
                        if(this.objetoSessao){
                            this.listarClassificacoesDeCelula(this.id_imagem, this.objetoSessao.id_usuario);
                        }
                        else{
                            this.listarClassificacoesDeCelula(this.id_imagem, 1);
                        }
                    },         500);
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

                    case HttpStatusCode.BAD_REQUEST: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    case HttpStatusCode.NOT_FOUND: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    case HttpStatusCode.FORBIDDEN: {
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

    async cadastrarClassificacao() {

        this.carregando = true;
        this.exibirModal = false;
        this.requisicao.id_lesao = this.id_lesao;
        this.requisicao.alturaOriginalImg = this.imagem.altura;
        this.requisicao.larguraOriginalImg = this.imagem.largura;

        this.cadastrarClassificacaoSubscription =
        this.imagemService.cadastrarClassificacao(this.id_imagem, this.objetoSessao.id_usuario, this.requisicao)
            .subscribe(
                (retorno) => {
                    this.imagem = retorno;
                    const destino = this.imagem.fonte_aquisicao == 1 ? this.comunicacaoApi.obterUrlBaseInterna() : this.comunicacaoApi.obterUrlBaseExterna();
                    this.caminho_imagem = `${this.comunicacaoApi.obterUrlBaseApi()}/${destino}/${this.imagem.nome}`;
                    this.indiceSelecionado = -1;
                    this.listarClassificacoesDeCelula(this.imagem.id, this.objetoSessao.id_usuario);
                    this.carregando = false;
                    console.log("Classification saved");
                },
                (erro) => {
                    this.carregando = false;
                    this.objetoErro = erro.error;

                    switch(this.objetoErro.status_code) {

                    case HttpStatusCode.UNAUTHORIZED: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    case HttpStatusCode.BAD_REQUEST: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    case HttpStatusCode.NOT_FOUND: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    case HttpStatusCode.FORBIDDEN: {
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

    listarTodasLesoes() {

        this.carregando = true;
        this.listarTodasLesoesSubscription =
        this.imagemService.listarLesoes()
            .subscribe(
                (retorno) => {
                    this.todasLesoes = retorno;
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

    listarClassificacoesDeCelula(id_imagem: number, id_analista: number) {

        this.carregando = true;
        this.listarClassificacoesDeCelulaSubscription =
        this.imagemService.listarClassificacoesCelula(id_imagem, id_analista)
            .subscribe(
                (retorno) => {
                    this.todasClassificacoes = retorno;
                    exibirClassificacoes(this.todasClassificacoes.celulas, this.indiceSelecionado);
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

                    case HttpStatusCode.BAD_REQUEST: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    case HttpStatusCode.NOT_FOUND: {
                        console.log(this.objetoErro.mensagem);
                        break;
                    }

                    case HttpStatusCode.FORBIDDEN: {
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

    exibirClassificacoesFormaSeletiva() {

        if(this.indiceSelecionado != this.indiceSelecionadoPadrao) {

            this.lesao.id = this.todasClassificacoes.celulas[this.indiceSelecionado].lesao.id;
            this.lesao.nome = this.todasClassificacoes.celulas[this.indiceSelecionado].lesao.nome;
            this.lesao.detalhes = this.todasClassificacoes.celulas[this.indiceSelecionado].lesao.detalhes;
        }

        exibirClassificacoes(this.todasClassificacoes.celulas, Number(this.indiceSelecionado));
    }

    permitirCadastro(valor: boolean) {
        this.permitirCadastroClassificacao = valor;
    }

    solicitarAtualizacaoDeDados() {

        this.imagemAtualizacao.codigo_lamina = this.imagem.codigo_lamina;
        this.imagemAtualizacao.lesao.nome = this.imagem.lesao.nome;
        this.imagemAtualizacao.lesao.id = this.imagem.lesao.id;
        this.imagemAtualizacao.dt_aquisicao = this.imagem.dt_aquisicao;
        this.atualizarInformacoes = true;
    }

    cancelarAtualizacao() {
        this.atualizarInformacoes = false;
    }

    atualizarClassificacao(indiceSelecionado) {

        this.carregando = true;
        const houveMudanca =
            this.imagemAtualizacao.codigo_lamina != this.imagem.codigo_lamina ||
            this.imagemAtualizacao.dt_aquisicao != this.imagem.dt_aquisicao ||
            this.lesao.id != this.todasClassificacoes.celulas[indiceSelecionado].lesao.id;

        if(houveMudanca) {

            console.log("******** A data de aquisicao nao esta atualizando ********");
            const requisicao = {
                codigo_lamina: this.imagemAtualizacao.codigo_lamina,
                dt_aquisicao: this.imagemAtualizacao.dt_aquisicao,
                id_lesao_celula: this.lesao.id,
                id_celula: this.todasClassificacoes.celulas[indiceSelecionado].id_celula
            };

            this.atualizarDadosImagemSubscription =
            this.imagemService.atualizarDadosImagem(this.imagem.id, this.objetoSessao.id_usuario, requisicao)
                .subscribe(
                    (retorno) => {
                        this.imagem = retorno;
                        const destino = this.imagem.fonte_aquisicao == 1 ? this.comunicacaoApi.obterUrlBaseInterna() : this.comunicacaoApi.obterUrlBaseExterna();
                        this.caminho_imagem = `${this.comunicacaoApi.obterUrlBaseApi()}/${destino}/${this.imagem.nome}`;
                        this.listarClassificacoesDeCelula(this.imagem.id, this.objetoSessao.id_usuario);
                        this.carregando = false;
                        this.atualizarInformacoes = false;
                    },
                    (erro) => {
                        this.carregando = false;
                        this.objetoErro = erro.error;

                        switch(this.objetoErro.status_code) {

                        case HttpStatusCode.UNAUTHORIZED: {
                            console.log(this.objetoErro.mensagem);
                            break;
                        }

                        case HttpStatusCode.BAD_REQUEST: {
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
        else{
            this.carregando = false;
            this.atualizarInformacoes = false;
            console.log("No one change made");
        }
    }

    excluitClassificacao(indiceSelecionado: number) {

        this.carregando = true;
        if(confirm(Mensagens.EXCLUIR_CLASSIFICACAO)) {

            const parametrosRequisicao = {
                id_imagem: this.id_imagem,
                id_celula: this.todasClassificacoes.celulas[indiceSelecionado].id_celula,
                id_usuario: this.objetoSessao.id_usuario
            };

            this.excluirRegistroDeClassificacaoSubscription =
            this.imagemService.excluirRegistroDeClassificacao(parametrosRequisicao)
                .subscribe(
                    (retorno) => {
                        this.imagem = retorno;
                        const destino = this.imagem.fonte_aquisicao == 1 ? this.comunicacaoApi.obterUrlBaseInterna() : this.comunicacaoApi.obterUrlBaseExterna();
                        this.caminho_imagem = `${this.comunicacaoApi.obterUrlBaseApi()}/${destino}/${this.imagem.nome}`;
                        this.listarClassificacoesDeCelula(this.imagem.id, this.objetoSessao.id_usuario);
                        this.indiceSelecionado = -1;
                        exibirClassificacoes(this.todasClassificacoes.celulas);
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

                        case HttpStatusCode.BAD_REQUEST: {
                            console.log(this.objetoErro.mensagem);
                            break;
                        }

                        case HttpStatusCode.NOT_FOUND: {
                            console.log(this.objetoErro.mensagem);
                            break;
                        }

                        case HttpStatusCode.FORBIDDEN: {
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
        else {
            this.carregando = false;
        }
    }
    //#endregion
}
