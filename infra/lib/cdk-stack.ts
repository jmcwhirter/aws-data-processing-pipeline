import * as cdk from '@aws-cdk/core';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as firehose from '@aws-cdk/aws-kinesisfirehose';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as glue from '@aws-cdk/aws-glue';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const reporting_stream = new kinesis.Stream(this, 'reporting_stream', {
      streamName: 'reporting_stream'
    });

    const bucket = new s3.Bucket(this, 'reporting_bucket', {
      bucketName: 'your-own-unique-bucket-for-reporting',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    const kinesis_role = new iam.Role(this, 'kinesis_role', {
      roleName: 'reporting_role',
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonKinesisReadOnlyAccess')
      ]
    });

    // reporting_stream.grantRead(kinesis_role);
    bucket.grantReadWrite(kinesis_role);

    new firehose.CfnDeliveryStream(this, 'reporting_firehose_json', {
      deliveryStreamName: 'reporting_firehose_json',
      deliveryStreamType: 'KinesisStreamAsSource',
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: reporting_stream.streamArn,
        roleArn: kinesis_role.roleArn
      },
      extendedS3DestinationConfiguration: {
        bucketArn: bucket.bucketArn,
        roleArn: kinesis_role.roleArn,
        prefix: 'json/',
        bufferingHints: {
          // intervalInSeconds: 900,
          // sizeInMBs: 128
        }
      }
    });

    const glue_crawler_role = new iam.Role(this, 'glue_crawler_role', {
      roleName: 'glue_crawler_role_reporting',
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')
      ]
    });

    bucket.grantReadWrite(glue_crawler_role);

    const glue_database = new glue.Database(this, 'glue_database', {
      databaseName: 'reporting-database'
    })

    new glue.CfnCrawler(this, 'glue_crawler_json', {
      name: 'Reporting Crawler - JSON',
      role: glue_crawler_role.roleArn,
      targets: {
        s3Targets: [
          {
            path: cdk.Fn.join('', ['s3://', bucket.bucketName, '/json'])
          }
        ]
      },
      databaseName: glue_database.databaseName
    });

    new glue.CfnCrawler(this, 'glue_crawler_parquet', {
      name: 'Reporting Crawler - Parquet',
      role: glue_crawler_role.roleArn,
      targets: {
        s3Targets: [
          {
            path: cdk.Fn.join('', ['s3://', bucket.bucketName, '/parquet'])
          }
        ]
      },
      databaseName: glue_database.databaseName
    });

    // new firehose.CfnDeliveryStream(this, 'reporting_firehose_parquet', {
    //   deliveryStreamName: 'reporting_firehose_parquet',
    //   deliveryStreamType: 'KinesisStreamAsSource',
    //   kinesisStreamSourceConfiguration: {
    //     kinesisStreamArn: reporting_stream.streamArn,
    //     roleArn: kinesis_role.roleArn
    //   },
    //   extendedS3DestinationConfiguration: {
    //     bucketArn: bucket.bucketArn,
    //     roleArn: kinesis_role.roleArn,
    //     prefix: 'parquet/',
    //     bufferingHints: {
    //       intervalInSeconds: 900,
    //       sizeInMBs: 128
    //     }
    //   }
    // });
  }
}
