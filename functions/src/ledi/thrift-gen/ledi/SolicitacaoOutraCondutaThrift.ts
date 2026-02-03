/* tslint:disable */
/* eslint-disable */
import * as thrift from "thrift";

export interface ISolicitacaoOutraCondutaThriftArgs {
    codigoSigtap?: string;
}

export class SolicitacaoOutraCondutaThrift {
    public codigoSigtap?: string;

    constructor(args?: ISolicitacaoOutraCondutaThriftArgs) {
        if (args != null && args.codigoSigtap != null) {
            this.codigoSigtap = args.codigoSigtap;
        }
    }

    public write(output: thrift.TProtocol): void {
        output.writeStructBegin("SolicitacaoOutraCondutaThrift");
        if (this.codigoSigtap != null) {
            output.writeFieldBegin("codigoSigtap", thrift.Thrift.Type.STRING, 1);
            output.writeString(this.codigoSigtap);
            output.writeFieldEnd();
        }
        output.writeFieldStop();
        output.writeStructEnd();
    }

    public static read(input: thrift.TProtocol): SolicitacaoOutraCondutaThrift {
        input.readStructBegin();
        let _args: any = {};
        while (true) {
            const ret: thrift.TField = input.readFieldBegin();
            const fieldType: thrift.Thrift.Type = ret.ftype;
            const fieldId: number = ret.fid;
            if (fieldType === thrift.Thrift.Type.STOP) break;
            switch (fieldId) {
                case 1:
                    if (fieldType === thrift.Thrift.Type.STRING) _args.codigoSigtap = input.readString();
                    else input.skip(fieldType);
                    break;
                default:
                    input.skip(fieldType);
            }
            input.readFieldEnd();
        }
        input.readStructEnd();
        return new SolicitacaoOutraCondutaThrift(_args);
    }
}
