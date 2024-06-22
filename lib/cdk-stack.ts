import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

const imageBucket = 'cdk-rekn-imagebuket-xerosoft';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

      const bucket = new s3.Bucket(this, imageBucket, {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      new cdk.CfnOutput(this, 'Bucket', {value: bucket.bucketName});

      const role = new iam.Role(this, 'cdk-rekn-lambdarole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      });

      role.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'rekognition:*',
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: ['*']
        })
      )

      const table = new dynamodb.Table(this, 'cdk-rekn-imagetable', {
        partitionKey: {name: 'Image', type: dynamodb.AttributeType.STRING},
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });
    
      new cdk.CfnOutput(this, 'Table', {value: table.tableName});

      const lambdaFn = new lambda.Function(this, 'cdk-rekn-function', {
        code: lambda.AssetCode.fromAsset('lambda'),
        runtime: lambda.Runtime.PYTHON_3_8,
        handler: 'index.handler',
        role: role,
        environment: {
          TABLE: table.tableName,
          BUCKET: bucket.bucketName,
        }
      });

      lambdaFn.addEventSource(
        new lambdaEventSources.S3EventSource(bucket, {
          events: [s3.EventType.OBJECT_CREATED]
        })
      );
      bucket.grantReadWrite(lambdaFn);
      table.grantFullAccess(lambdaFn);
  }
}
