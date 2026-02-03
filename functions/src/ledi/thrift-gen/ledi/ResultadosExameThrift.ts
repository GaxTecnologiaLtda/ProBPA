/* tslint:disable */
/* eslint-disable */
import Int64 = require("node-int64");
import * as thrift from "thrift";
import * as ResultadoExameThrift from "./ResultadoExameThrift";

export interface IResultadosExameThriftArgs {
    exame?: string;
    dataSolicitacao?: number | Int64;
    dataRealizacao?: number | Int64;
    dataResultado?: number | Int64;
    resultadoExame?: Array<ResultadoExameThrift.ResultadoExameThrift>;
}

export class ResultadosExameThrift {
    public exame?: string;
    public dataSolicitacao?: Int64;
    public dataRealizacao?: Int64;
    public dataResultado?: Int64;
    public resultadoExame?: Array<ResultadoExameThrift.ResultadoExameThrift>;

    constructor(args?: IResultadosExameThriftArgs) {
        if (args != null) {
            if (args.exame != null) this.exame = args.exame;
            if (args.dataSolicitacao != null) this.dataSolicitacao = typeof args.dataSolicitacao === 'number' ? new Int64(args.dataSolicitacao) : args.dataSolicitacao;
            if (args.dataRealizacao != null) this.dataRealizacao = typeof args.dataRealizacao === 'number' ? new Int64(args.dataRealizacao) : args.dataRealizacao;
            if (args.dataResultado != null) this.dataResultado = typeof args.dataResultado === 'number' ? new Int64(args.dataResultado) : args.dataResultado;
            if (args.resultadoExame != null) this.resultadoExame = args.resultadoExame;
        }
    }

    public write(output: thrift.TProtocol): void {
        output.writeStructBegin("ResultadosExameThrift");
        if (this.exame != null) {
            output.writeFieldBegin("exame", thrift.Thrift.Type.STRING, 1);
            output.writeString(this.exame);
            output.writeFieldEnd();
        }
        if (this.dataSolicitacao != null) {
            output.writeFieldBegin("dataSolicitacao", thrift.Thrift.Type.I64, 2);
            output.writeI64(this.dataSolicitacao);
            output.writeFieldEnd();
        }
        if (this.dataRealizacao != null) {
            output.writeFieldBegin("dataRealizacao", thrift.Thrift.Type.I64, 3);
            output.writeI64(this.dataRealizacao);
            output.writeFieldEnd();
        }
        if (this.dataResultado != null) {
            output.writeFieldBegin("dataResultado", thrift.Thrift.Type.I64, 4);
            output.writeI64(this.dataResultado);
            output.writeFieldEnd();
        }
        if (this.resultadoExame != null) {
            output.writeFieldBegin("resultadoExame", thrift.Thrift.Type.LIST, 5);
            output.writeListBegin(thrift.Thrift.Type.STRUCT, this.resultadoExame.length);
            this.resultadoExame.forEach((val: ResultadoExameThrift.ResultadoExameThrift) => {
                val.write(output);
            });
            output.writeListEnd();
            output.writeFieldEnd();
        }
        output.writeFieldStop();
        output.writeStructEnd();
    }

    public static read(input: thrift.TProtocol): ResultadosExameThrift {
        input.readStructBegin();
        let _args: any = {};
        while (true) {
            const ret: thrift.TField = input.readFieldBegin();
            const fieldType: thrift.Thrift.Type = ret.ftype;
            const fieldId: number = ret.fid;
            if (fieldType === thrift.Thrift.Type.STOP) break;
            switch (fieldId) {
                case 1:
                    if (fieldType === thrift.Thrift.Type.STRING) _args.exame = input.readString();
                    else input.skip(fieldType);
                    break;
                case 2:
                    if (fieldType === thrift.Thrift.Type.I64) _args.dataSolicitacao = input.readI64();
                    else input.skip(fieldType);
                    break;
                case 3:
                    if (fieldType === thrift.Thrift.Type.I64) _args.dataRealizacao = input.readI64();
                    else input.skip(fieldType);
                    break;
                case 4:
                    if (fieldType === thrift.Thrift.Type.I64) _args.dataResultado = input.readI64();
                    else input.skip(fieldType);
                    break;
                case 5:
                    if (fieldType === thrift.Thrift.Type.LIST) {
                        const value: Array<ResultadoExameThrift.ResultadoExameThrift> = [];
                        const metadata = input.readListBegin();
                        const size = metadata.size;
                        for (let i = 0; i < size; i++) {
                            const v = ResultadoExameThrift.ResultadoExameThrift.read(input);
                            value.push(v);
                        }
                        input.readListEnd();
                        _args.resultadoExame = value;
                    } else input.skip(fieldType);
                    break;
                default:
                    input.skip(fieldType);
            }
            input.readFieldEnd();
        }
        input.readStructEnd();
        return new ResultadosExameThrift(_args);
    }
}
