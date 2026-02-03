/* tslint:disable */
/* eslint-disable */
import Int64 = require("node-int64");
import * as thrift from "thrift";

export interface IResultadoExameThriftArgs {
    tipoResultado?: number | Int64;
    valorResultado?: string;
}

export class ResultadoExameThrift {
    public tipoResultado?: Int64;
    public valorResultado?: string;

    constructor(args?: IResultadoExameThriftArgs) {
        if (args != null) {
            if (args.tipoResultado != null) this.tipoResultado = typeof args.tipoResultado === 'number' ? new Int64(args.tipoResultado) : args.tipoResultado;
            if (args.valorResultado != null) this.valorResultado = args.valorResultado;
        }
    }

    public write(output: thrift.TProtocol): void {
        output.writeStructBegin("ResultadoExameThrift");
        if (this.tipoResultado != null) {
            output.writeFieldBegin("tipoResultado", thrift.Thrift.Type.I64, 1);
            output.writeI64(this.tipoResultado);
            output.writeFieldEnd();
        }
        if (this.valorResultado != null) {
            output.writeFieldBegin("valorResultado", thrift.Thrift.Type.STRING, 2);
            output.writeString(this.valorResultado);
            output.writeFieldEnd();
        }
        output.writeFieldStop();
        output.writeStructEnd();
    }

    public static read(input: thrift.TProtocol): ResultadoExameThrift {
        input.readStructBegin();
        let _args: any = {};
        while (true) {
            const ret: thrift.TField = input.readFieldBegin();
            const fieldType: thrift.Thrift.Type = ret.ftype;
            const fieldId: number = ret.fid;
            if (fieldType === thrift.Thrift.Type.STOP) break;
            switch (fieldId) {
                case 1:
                    if (fieldType === thrift.Thrift.Type.I64) _args.tipoResultado = input.readI64();
                    else input.skip(fieldType);
                    break;
                case 2:
                    if (fieldType === thrift.Thrift.Type.STRING) _args.valorResultado = input.readString();
                    else input.skip(fieldType);
                    break;
                default:
                    input.skip(fieldType);
            }
            input.readFieldEnd();
        }
        input.readStructEnd();
        return new ResultadoExameThrift(_args);
    }
}
