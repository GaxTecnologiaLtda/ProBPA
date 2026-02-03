declare module 'easy-soap-request' {
    interface Options {
        url: string;
        headers: object;
        xml: string;
        timeout?: number;
    }
    interface Response {
        response: {
            headers: any;
            body: string;
            statusCode: number;
        };
    }
    export default function soapRequest(options: Options): Promise<Response>;
}
