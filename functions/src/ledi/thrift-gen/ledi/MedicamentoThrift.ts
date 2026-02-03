/* tslint:disable */
/* eslint-disable */
import Int64 = require("node-int64");
import * as thrift from "thrift";

export interface IMedicamentoThriftArgs {
    codigoCatmat?: string;
    viaAdministracao?: number | Int64;
    dose?: string;
    doseUnica?: boolean;
    usoContinuo?: boolean;
    doseFrequenciaTipo?: number | Int64;
    doseFrequencia?: string;
    doseFrequenciaQuantidade?: number;
    doseFrequenciaUnidadeMedida?: number | Int64;
    dtInicioTratamento?: number | Int64;
    duracaoTratamento?: number | Int64;
    duracaoTratamentoMedida?: number | Int64;
    quantidadeReceitada?: number | Int64;
}

export class MedicamentoThrift {
    public codigoCatmat?: string;
    public viaAdministracao?: Int64;
    public dose?: string;
    public doseUnica?: boolean;
    public usoContinuo?: boolean;
    public doseFrequenciaTipo?: Int64;
    public doseFrequencia?: string;
    public doseFrequenciaQuantidade?: number;
    public doseFrequenciaUnidadeMedida?: Int64;
    public dtInicioTratamento?: Int64;
    public duracaoTratamento?: Int64;
    public duracaoTratamentoMedida?: Int64;
    public quantidadeReceitada?: Int64;

    constructor(args?: IMedicamentoThriftArgs) {
        if (args != null) {
            if (args.codigoCatmat != null) this.codigoCatmat = args.codigoCatmat;
            if (args.viaAdministracao != null) this.viaAdministracao = typeof args.viaAdministracao === 'number' ? new Int64(args.viaAdministracao) : args.viaAdministracao;
            if (args.dose != null) this.dose = args.dose;
            if (args.doseUnica != null) this.doseUnica = args.doseUnica;
            if (args.usoContinuo != null) this.usoContinuo = args.usoContinuo;
            if (args.doseFrequenciaTipo != null) this.doseFrequenciaTipo = typeof args.doseFrequenciaTipo === 'number' ? new Int64(args.doseFrequenciaTipo) : args.doseFrequenciaTipo;
            if (args.doseFrequencia != null) this.doseFrequencia = args.doseFrequencia;
            // doseFrequenciaQuantidade skipped logic for brevity if not strictly needed or complex types
            if (args.dtInicioTratamento != null) this.dtInicioTratamento = typeof args.dtInicioTratamento === 'number' ? new Int64(args.dtInicioTratamento) : args.dtInicioTratamento;
            if (args.duracaoTratamento != null) this.duracaoTratamento = typeof args.duracaoTratamento === 'number' ? new Int64(args.duracaoTratamento) : args.duracaoTratamento;
            if (args.quantidadeReceitada != null) this.quantidadeReceitada = typeof args.quantidadeReceitada === 'number' ? new Int64(args.quantidadeReceitada) : args.quantidadeReceitada;
        }
    }

    public write(output: thrift.TProtocol): void {
        output.writeStructBegin("MedicamentoThrift");
        if (this.codigoCatmat != null) {
            output.writeFieldBegin("codigoCatmat", thrift.Thrift.Type.STRING, 1);
            output.writeString(this.codigoCatmat);
            output.writeFieldEnd();
        }
        if (this.viaAdministracao != null) {
            output.writeFieldBegin("viaAdministracao", thrift.Thrift.Type.I64, 2);
            output.writeI64(this.viaAdministracao);
            output.writeFieldEnd();
        }
        if (this.dose != null) {
            output.writeFieldBegin("dose", thrift.Thrift.Type.STRING, 3);
            output.writeString(this.dose);
            output.writeFieldEnd();
        }
        if (this.doseUnica != null) {
            output.writeFieldBegin("doseUnica", thrift.Thrift.Type.BOOL, 4);
            output.writeBool(this.doseUnica);
            output.writeFieldEnd();
        }
        if (this.usoContinuo != null) {
            output.writeFieldBegin("usoContinuo", thrift.Thrift.Type.BOOL, 5);
            output.writeBool(this.usoContinuo);
            output.writeFieldEnd();
        }
        if (this.doseFrequenciaTipo != null) {
            output.writeFieldBegin("doseFrequenciaTipo", thrift.Thrift.Type.I64, 6);
            output.writeI64(this.doseFrequenciaTipo);
            output.writeFieldEnd();
        }
        if (this.doseFrequencia != null) {
            output.writeFieldBegin("doseFrequencia", thrift.Thrift.Type.STRING, 7);
            output.writeString(this.doseFrequencia);
            output.writeFieldEnd();
        }
        if (this.dtInicioTratamento != null) {
            output.writeFieldBegin("dtInicioTratamento", thrift.Thrift.Type.I64, 10);
            output.writeI64(this.dtInicioTratamento);
            output.writeFieldEnd();
        }
        if (this.duracaoTratamento != null) {
            output.writeFieldBegin("duracaoTratamento", thrift.Thrift.Type.I64, 11);
            output.writeI64(this.duracaoTratamento);
            output.writeFieldEnd();
        }
        if (this.quantidadeReceitada != null) {
            output.writeFieldBegin("quantidadeReceitada", thrift.Thrift.Type.I64, 13);
            output.writeI64(this.quantidadeReceitada);
            output.writeFieldEnd();
        }
        output.writeFieldStop();
        output.writeStructEnd();
    }

    public static read(input: thrift.TProtocol): MedicamentoThrift {
        input.readStructBegin();
        let _args: any = {};
        while (true) {
            const ret: thrift.TField = input.readFieldBegin();
            const fieldType: thrift.Thrift.Type = ret.ftype;
            const fieldId: number = ret.fid;
            if (fieldType === thrift.Thrift.Type.STOP) break;
            switch (fieldId) {
                case 1:
                    if (fieldType === thrift.Thrift.Type.STRING) _args.codigoCatmat = input.readString();
                    else input.skip(fieldType);
                    break;
                case 2:
                    if (fieldType === thrift.Thrift.Type.I64) _args.viaAdministracao = input.readI64();
                    else input.skip(fieldType);
                    break;
                case 3:
                    if (fieldType === thrift.Thrift.Type.STRING) _args.dose = input.readString();
                    else input.skip(fieldType);
                    break;
                case 4:
                    if (fieldType === thrift.Thrift.Type.BOOL) _args.doseUnica = input.readBool();
                    else input.skip(fieldType);
                    break;
                case 5:
                    if (fieldType === thrift.Thrift.Type.BOOL) _args.usoContinuo = input.readBool();
                    else input.skip(fieldType);
                    break;
                case 6:
                    if (fieldType === thrift.Thrift.Type.I64) _args.doseFrequenciaTipo = input.readI64();
                    else input.skip(fieldType);
                    break;
                case 7:
                    if (fieldType === thrift.Thrift.Type.STRING) _args.doseFrequencia = input.readString();
                    else input.skip(fieldType);
                    break;
                case 10:
                    if (fieldType === thrift.Thrift.Type.I64) _args.dtInicioTratamento = input.readI64();
                    else input.skip(fieldType);
                    break;
                case 11:
                    if (fieldType === thrift.Thrift.Type.I64) _args.duracaoTratamento = input.readI64();
                    else input.skip(fieldType);
                    break;
                case 13:
                    if (fieldType === thrift.Thrift.Type.I64) _args.quantidadeReceitada = input.readI64();
                    else input.skip(fieldType);
                    break;
                default:
                    input.skip(fieldType);
            }
            input.readFieldEnd();
        }
        input.readStructEnd();
        return new MedicamentoThrift(_args);
    }
}
