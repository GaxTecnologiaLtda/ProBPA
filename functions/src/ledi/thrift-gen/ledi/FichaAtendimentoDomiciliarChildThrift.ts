/* tslint:disable */
/* eslint-disable */
import * as thrift from 'thrift';
import * as ProblemaCondicaoThrift from './ProblemaCondicaoThrift';


export interface IFichaAtendimentoDomiciliarChildThrift {
    turno?: number;
    cnsCidadao?: string;
    dataNascimento?: number;
    sexo?: number;
    localDeAtendimento?: number;
    atencaoDomiciliarModalidade?: number;
    tipoAtendimento?: number;
    condicoesAvaliadas?: number[];
    problemasCondicoes?: ProblemaCondicaoThrift.ProblemaCondicaoThrift[];
    procedimentos?: string[];
    condutaDesfecho?: number;
    cpfCidadao?: string;
}

export class FichaAtendimentoDomiciliarChildThrift {
    public turno?: number;
    public cnsCidadao?: string;
    public dataNascimento?: number;
    public sexo?: number;
    public localDeAtendimento?: number;
    public atencaoDomiciliarModalidade?: number;
    public tipoAtendimento?: number;
    public condicoesAvaliadas?: number[];
    public problemasCondicoes?: ProblemaCondicaoThrift.ProblemaCondicaoThrift[];
    public procedimentos?: string[];
    public condutaDesfecho?: number;
    public cpfCidadao?: string;

    constructor(args?: IFichaAtendimentoDomiciliarChildThrift) {
        if (args != null) {
            if (args.turno !== undefined) this.turno = args.turno;
            if (args.cnsCidadao !== undefined) this.cnsCidadao = args.cnsCidadao;
            if (args.dataNascimento !== undefined) this.dataNascimento = args.dataNascimento;
            if (args.sexo !== undefined) this.sexo = args.sexo;
            if (args.localDeAtendimento !== undefined) this.localDeAtendimento = args.localDeAtendimento;
            if (args.atencaoDomiciliarModalidade !== undefined) this.atencaoDomiciliarModalidade = args.atencaoDomiciliarModalidade;
            if (args.tipoAtendimento !== undefined) this.tipoAtendimento = args.tipoAtendimento;
            if (args.condicoesAvaliadas !== undefined) this.condicoesAvaliadas = args.condicoesAvaliadas;
            if (args.problemasCondicoes !== undefined) this.problemasCondicoes = args.problemasCondicoes;
            if (args.procedimentos !== undefined) this.procedimentos = args.procedimentos;
            if (args.condutaDesfecho !== undefined) this.condutaDesfecho = args.condutaDesfecho;
            if (args.cpfCidadao !== undefined) this.cpfCidadao = args.cpfCidadao;
        }
    }

    public write(output: thrift.TProtocol): void {
        output.writeStructBegin("FichaAtendimentoDomiciliarChildThrift");
        if (this.turno != null) {
            output.writeFieldBegin("turno", thrift.Thrift.Type.I64, 1);
            output.writeI64(this.turno);
            output.writeFieldEnd();
        }
        if (this.cnsCidadao != null) {
            output.writeFieldBegin("cnsCidadao", thrift.Thrift.Type.STRING, 2);
            output.writeString(this.cnsCidadao);
            output.writeFieldEnd();
        }
        if (this.dataNascimento != null) {
            output.writeFieldBegin("dataNascimento", thrift.Thrift.Type.I64, 3);
            output.writeI64(this.dataNascimento);
            output.writeFieldEnd();
        }
        if (this.sexo != null) {
            output.writeFieldBegin("sexo", thrift.Thrift.Type.I64, 4);
            output.writeI64(this.sexo);
            output.writeFieldEnd();
        }
        if (this.localDeAtendimento != null) {
            output.writeFieldBegin("localDeAtendimento", thrift.Thrift.Type.I64, 5);
            output.writeI64(this.localDeAtendimento);
            output.writeFieldEnd();
        }
        if (this.atencaoDomiciliarModalidade != null) {
            output.writeFieldBegin("atencaoDomiciliarModalidade", thrift.Thrift.Type.I64, 6);
            output.writeI64(this.atencaoDomiciliarModalidade);
            output.writeFieldEnd();
        }
        if (this.tipoAtendimento != null) {
            output.writeFieldBegin("tipoAtendimento", thrift.Thrift.Type.I64, 7);
            output.writeI64(this.tipoAtendimento);
            output.writeFieldEnd();
        }
        if (this.condicoesAvaliadas != null) {
            output.writeFieldBegin("condicoesAvaliadas", thrift.Thrift.Type.LIST, 8);
            output.writeListBegin(thrift.Thrift.Type.I64, this.condicoesAvaliadas.length);
            for (let iter1 of this.condicoesAvaliadas) {
                output.writeI64(iter1);
            }
            output.writeListEnd();
            output.writeFieldEnd();
        }
        if (this.procedimentos != null) {
            output.writeFieldBegin("procedimentos", thrift.Thrift.Type.LIST, 11);
            output.writeListBegin(thrift.Thrift.Type.STRING, this.procedimentos.length);
            for (let iter2 of this.procedimentos) {
                output.writeString(iter2);
            }
            output.writeListEnd();
            output.writeFieldEnd();
        }
        if (this.condutaDesfecho != null) {
            output.writeFieldBegin("condutaDesfecho", thrift.Thrift.Type.I64, 13);
            output.writeI64(this.condutaDesfecho);
            output.writeFieldEnd();
        }
        if (this.cpfCidadao != null) {
            output.writeFieldBegin("cpfCidadao", thrift.Thrift.Type.STRING, 15);
            output.writeString(this.cpfCidadao);
            output.writeFieldEnd();
        }
        if (this.problemasCondicoes != null) {
            output.writeFieldBegin("problemasCondicoes", thrift.Thrift.Type.LIST, 16);
            output.writeListBegin(thrift.Thrift.Type.STRUCT, this.problemasCondicoes.length);
            for (let iter3 of this.problemasCondicoes) {
                iter3.write(output);
            }
            output.writeListEnd();
            output.writeFieldEnd();
        }
        output.writeFieldStop();
        output.writeStructEnd();
    }

    public static read(input: thrift.TProtocol): FichaAtendimentoDomiciliarChildThrift {
        input.readStructBegin();
        let _args: any = {};
        while (true) {
            const ret: thrift.TField = input.readFieldBegin();
            const fieldType: thrift.Thrift.Type = ret.ftype;
            const fieldId: number = ret.fid;
            if (fieldType === thrift.Thrift.Type.STOP) {
                break;
            }
            switch (fieldId) {
                case 1:
                    if (fieldType === thrift.Thrift.Type.I64) {
                        const value_1: thrift.Int64 = input.readI64();
                        _args.turno = value_1;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 2:
                    if (fieldType === thrift.Thrift.Type.STRING) {
                        const value_2: string = input.readString();
                        _args.cnsCidadao = value_2;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 3:
                    if (fieldType === thrift.Thrift.Type.I64) {
                        const value_3: thrift.Int64 = input.readI64();
                        _args.dataNascimento = value_3;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 4:
                    if (fieldType === thrift.Thrift.Type.I64) {
                        const value_4: thrift.Int64 = input.readI64();
                        _args.sexo = value_4;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 5:
                    if (fieldType === thrift.Thrift.Type.I64) {
                        const value_5: thrift.Int64 = input.readI64();
                        _args.localDeAtendimento = value_5;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 6:
                    if (fieldType === thrift.Thrift.Type.I64) {
                        const value_6: thrift.Int64 = input.readI64();
                        _args.atencaoDomiciliarModalidade = value_6;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 7:
                    if (fieldType === thrift.Thrift.Type.I64) {
                        const value_7: thrift.Int64 = input.readI64();
                        _args.tipoAtendimento = value_7;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 8:
                    if (fieldType === thrift.Thrift.Type.LIST) {
                        const value_8: Array<thrift.Int64> = new Array<thrift.Int64>();
                        const metadata_1: thrift.TList = input.readListBegin();
                        const size_1: number = metadata_1.size;
                        for (let i_1: number = 0; i_1 < size_1; i_1++) {
                            const value_9: thrift.Int64 = input.readI64();
                            value_8.push(value_9);
                        }
                        input.readListEnd();
                        _args.condicoesAvaliadas = value_8;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 11:
                    if (fieldType === thrift.Thrift.Type.LIST) {
                        const value_10: Array<string> = new Array<string>();
                        const metadata_2: thrift.TList = input.readListBegin();
                        const size_2: number = metadata_2.size;
                        for (let i_2: number = 0; i_2 < size_2; i_2++) {
                            const value_11: string = input.readString();
                            value_10.push(value_11);
                        }
                        input.readListEnd();
                        _args.procedimentos = value_10;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 13:
                    if (fieldType === thrift.Thrift.Type.I64) {
                        const value_12: thrift.Int64 = input.readI64();
                        _args.condutaDesfecho = value_12;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 15:
                    if (fieldType === thrift.Thrift.Type.STRING) {
                        const value_13: string = input.readString();
                        _args.cpfCidadao = value_13;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                case 16:
                    if (fieldType === thrift.Thrift.Type.LIST) {
                        const value_14: Array<ProblemaCondicaoThrift.ProblemaCondicaoThrift> = new Array<ProblemaCondicaoThrift.ProblemaCondicaoThrift>();
                        const metadata_3: thrift.TList = input.readListBegin();
                        const size_3: number = metadata_3.size;
                        for (let i_3: number = 0; i_3 < size_3; i_3++) {
                            const value_15: ProblemaCondicaoThrift.ProblemaCondicaoThrift = ProblemaCondicaoThrift.ProblemaCondicaoThrift.read(input);
                            value_14.push(value_15);
                        }
                        input.readListEnd();
                        _args.problemasCondicoes = value_14;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                default: {
                    input.skip(fieldType);
                }
            }
            input.readFieldEnd();
        }
        input.readStructEnd();
        return new FichaAtendimentoDomiciliarChildThrift(_args);
    }
}
