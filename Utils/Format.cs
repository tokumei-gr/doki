namespace Doki.Utils
{
  public static class Format
  {
    public static string DokiCompatibleFileName(string raw) => raw.Replace("app/build/", "");
  }
}