/* tslint:disable */
/* eslint-disable */
import * as thrift from "thrift";

export interface ISolicitacaoOciThriftArgs {
    codigoSigtap?: string;
}

export class SolicitacaoOciThrift {
    public codigoSigtap?: string;

    constructor(args?: ISolicitacaoOciThriftArgs) {
        if (args != null && args.codigoSigtap != null) {
            this.codigoSigtap = args.codigoSigtap;
        }
    }

    public write(output: thrift.TProtocol): void {
        output.writeStructBegin("SolicitacaoOciThrift");
        if (this.codigoSigtap != null) {
            output.writeFieldBegin("codigoSigtap", thrift.Thrift.Type.STRING, 1);
            output.writeString(this.codigoSigtap);
            output.writeFieldEnd();
        }
        output.writeFieldStop();
        output.writeStructEnd();
    }

    public static read(input: thrift.TProtocol): SolicitacaoOciThrift {
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
                    if (fieldType === thrift.Thrift.Type.STRING) {
                        const value_1: string = input.readString();
                        _args.codigoSigtap = value_1;
                    }
                    else {
                        input.skip(fieldType);
                    }
                    break;
                default:
                    input.skip(fieldType);
            }
            input.readFieldEnd();
        }
        input.readStructEnd();
        return new SolicitacaoOciThrift(_args);
    }
}
