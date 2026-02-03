/* tslint:disable */
/* eslint-disable */
import Int64 = require("node-int64");
import * as thrift from "thrift";

export interface IEncaminhamentoThriftArgs {
    especialidade?: number | Int64;
    hipoteseDiagnosticoCID10?: string;
    hipoteseDiagnosticoCIAP2?: string;
    classificacaoRisco?: number | Int64;
}

export class EncaminhamentoThrift {
    public especialidade?: Int64;
    public hipoteseDiagnosticoCID10?: string;
    public hipoteseDiagnosticoCIAP2?: string;
    public classificacaoRisco?: Int64;

    constructor(args?: IEncaminhamentoThriftArgs) {
        if (args != null) {
            if (args.especialidade != null) this.especialidade = typeof args.especialidade === "number" ? new Int64(args.especialidade) : args.especialidade;
            if (args.hipoteseDiagnosticoCID10 != null) this.hipoteseDiagnosticoCID10 = args.hipoteseDiagnosticoCID10;
            if (args.hipoteseDiagnosticoCIAP2 != null) this.hipoteseDiagnosticoCIAP2 = args.hipoteseDiagnosticoCIAP2;
            if (args.classificacaoRisco != null) this.classificacaoRisco = typeof args.classificacaoRisco === "number" ? new Int64(args.classificacaoRisco) : args.classificacaoRisco;
        }
    }

    public write(output: thrift.TProtocol): void {
        output.writeStructBegin("EncaminhamentoThrift");
        if (this.especialidade != null) {
            output.writeFieldBegin("especialidade", thrift.Thrift.Type.I64, 1);
            output.writeI64(this.especialidade);
            output.writeFieldEnd();
        }
        if (this.hipoteseDiagnosticoCID10 != null) {
            output.writeFieldBegin("hipoteseDiagnosticoCID10", thrift.Thrift.Type.STRING, 2);
            output.writeString(this.hipoteseDiagnosticoCID10);
            output.writeFieldEnd();
        }
        if (this.hipoteseDiagnosticoCIAP2 != null) {
            output.writeFieldBegin("hipoteseDiagnosticoCIAP2", thrift.Thrift.Type.STRING, 3);
            output.writeString(this.hipoteseDiagnosticoCIAP2);
            output.writeFieldEnd();
        }
        if (this.classificacaoRisco != null) {
            output.writeFieldBegin("classificacaoRisco", thrift.Thrift.Type.I64, 4);
            output.writeI64(this.classificacaoRisco);
            output.writeFieldEnd();
        }
        output.writeFieldStop();
        output.writeStructEnd();
    }

    public static read(input: thrift.TProtocol): EncaminhamentoThrift {
        input.readStructBegin();
        let _args: any = {};
        while (true) {
            const ret: thrift.TField = input.readFieldBegin();
            const fieldType: thrift.Thrift.Type = ret.ftype;
            const fieldId: number = ret.fid;
            if (fieldType === thrift.Thrift.Type.STOP) break;
            switch (fieldId) {
                case 1:
                    if (fieldType === thrift.Thrift.Type.I64) _args.especialidade = input.readI64();
                    else input.skip(fieldType);
                    break;
                case 2:
                    if (fieldType === thrift.Thrift.Type.STRING) _args.hipoteseDiagnosticoCID10 = input.readString();
                    else input.skip(fieldType);
                    break;
                case 3:
                    if (fieldType === thrift.Thrift.Type.STRING) _args.hipoteseDiagnosticoCIAP2 = input.readString();
                    else input.skip(fieldType);
                    break;
                case 4:
                    if (fieldType === thrift.Thrift.Type.I64) _args.classificacaoRisco = input.readI64();
                    else input.skip(fieldType);
                    break;
                default:
                    input.skip(fieldType);
            }
            input.readFieldEnd();
        }
        input.readStructEnd();
        return new EncaminhamentoThrift(_args);
    }
}
