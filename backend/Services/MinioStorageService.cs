using Minio;
using Minio.DataModel.Args;

namespace Qablny.Services;

public class MinioStorageService(IMinioClient minio, IConfiguration config)
{
    private string PublicUrl => config["MinIO:PublicUrl"] ?? "http://localhost:9000";
    private const string DefaultBucket = "qablny";

    public async Task<string> UploadAsync(Stream stream, string objectName, string contentType,
        string bucket = DefaultBucket, CancellationToken ct = default)
    {
        // Ensure bucket exists
        var exists = await minio.BucketExistsAsync(new BucketExistsArgs().WithBucket(bucket), ct);
        if (!exists)
        {
            await minio.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucket), ct);
            // Set public read policy
            var policy = $$"""
            {
              "Version":"2012-10-17",
              "Statement":[{"Effect":"Allow","Principal":"*",
                "Action":["s3:GetObject"],"Resource":["arn:aws:s3:::{{bucket}}/*"]}]
            }
            """;
            await minio.SetPolicyAsync(new SetPolicyArgs().WithBucket(bucket).WithPolicy(policy), ct);
        }

        var putArgs = new PutObjectArgs()
            .WithBucket(bucket)
            .WithObject(objectName)
            .WithStreamData(stream)
            .WithObjectSize(stream.Length < 0 ? -1 : stream.Length)
            .WithContentType(contentType);

        await minio.PutObjectAsync(putArgs, ct);
        return GetPublicUrl(objectName, bucket);
    }

    public async Task DeleteAsync(string objectName, string bucket = DefaultBucket, CancellationToken ct = default)
    {
        var args = new RemoveObjectArgs().WithBucket(bucket).WithObject(objectName);
        await minio.RemoveObjectAsync(args, ct);
    }

    public string GetPublicUrl(string objectName, string bucket = DefaultBucket) =>
        $"{PublicUrl.TrimEnd('/')}/{bucket}/{objectName}";
}
